import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { Business } from '../models/Business';
import { Table } from '../models/Table';
import { Product } from '../models/Product';
import { Recipe } from '../models/Recipe';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { emitToBusiness, emitToOrder } from '../websocket/socketManager';
import { generateDailyOrderId } from '../utils/orderSequence';
import mongoose from 'mongoose';

// Public: Place Order (Guest Customer scanning QR code)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { qrToken, customerName, customerPhone, items, paymentMethod, idempotencyKey, notes } = req.body;

    if (!qrToken || !customerName || !customerPhone || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Table token, customer details, and at least one item are required.' }
      });
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        return res.json({
          success: true,
          message: 'Order retrieved via Idempotency-Key',
          data: existingOrder
        });
      }
    }

    // 2. Validate Table & Business Business
    const table = await Table.findOne({ qrToken });
    if (!table) {
      return res.status(404).json({
        success: false,
        error: { code: 'TABLE_NOT_FOUND', message: 'Invalid or inactive table QR code token.' }
      });
    }

    const business = await Business.findById(table.businessId);
    if (!business || business.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: { code: 'BUSINESS_INACTIVE', message: 'This business is currently inactive.' }
      });
    }

    // 3. Process Items and build exact snapshots
    let subtotalPaise = 0;
    const itemSnapshots = [];

    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, businessId: business._id });
      if (!product || !product.isAvailable) {
        return res.status(400).json({
          success: false,
          error: { code: 'PRODUCT_UNAVAILABLE', message: `Item '${item.name || 'product'}' is currently unavailable.` }
        });
      }

      let unitPricePaise = product.pricePaise;

      // Handle variant pricing if specified
      if (item.variantName && product.variants && product.variants.length > 0) {
        const foundVariant = product.variants.find((v) => v.name === item.variantName);
        if (foundVariant) {
          unitPricePaise = foundVariant.pricePaise;
        }
      }

      // Handle addon pricing if specified
      let addonsTotalPricePaise = 0;
      const addonSnapshots = [];
      if (item.addons && Array.isArray(item.addons)) {
        for (const add of item.addons) {
          const foundAddon = product.addons.find((a) => a.name === add.name);
          if (foundAddon) {
            addonsTotalPricePaise += foundAddon.pricePaise;
            addonSnapshots.push({ name: foundAddon.name, pricePaise: foundAddon.pricePaise });
          }
        }
      }

      const singleItemTotalPaise = (unitPricePaise + addonsTotalPricePaise) * item.quantity;
      subtotalPaise += singleItemTotalPaise;

      itemSnapshots.push({
        productId: product._id,
        name: product.name,
        pricePaise: unitPricePaise,
        quantity: item.quantity,
        variantName: item.variantName || '',
        addons: addonSnapshots,
        itemTotalPaise: singleItemTotalPaise,
        notes: item.notes || ''
      });
    }

    // Calculate Tax & Platform Fee
    const taxPaise = Math.round((subtotalPaise * (business.taxRatePercentage || 5)) / 100);
    const platformFeePaise = business.perOrderFeePaise || 200; // ₹2
    const totalAmountPaise = subtotalPaise + taxPaise;
    const businessEarningsPaise = totalAmountPaise - platformFeePaise;

    // 4. Generate Atomic Daily Order ID (e.g. ART-120926-0001)
    const { orderId, dateKey, sequenceNumber } = await generateDailyOrderId(business._id);

    const order = await Order.create({
      orderId,
      orderNumber: orderId,
      businessId: business._id,
      dateKey,
      sequenceNumber,
      tableId: table._id,
      tableName: table.tableNumber,
      customerName,
      customerPhone,
      source: 'QR_TABLE',
      items: itemSnapshots,
      subtotalPaise,
      taxPaise,
      platformFeePaise,
      totalAmountPaise,
      businessEarningsPaise,
      orderStatus: 'PLACED',
      paymentStatus: paymentMethod === 'ONLINE' ? 'PAID' : 'UNPAID',
      paymentMethod: paymentMethod || 'ONLINE',
      transactionId: paymentMethod === 'ONLINE' ? `PAY_${Date.now()}` : '',
      idempotencyKey,
      notes: notes || '',
      timeline: { placedAt: new Date() }
    });

    // Update table status to occupied
    table.status = 'OCCUPIED';
    await table.save();

    // 5. Trigger Realtime WebSocket Notification
    emitToBusiness(business._id.toString(), 'order:new', {
      _id: order._id,
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      tableName: order.tableName,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotalPaise: order.subtotalPaise,
      taxPaise: order.taxPaise,
      totalAmountPaise: order.totalAmountPaise,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Public/Owner: Get Single Order Details by ID or orderId
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let order = null;
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderId: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }

    const business = await Business.findById(order.businessId);

    // Calculate customer statistics
    const customerOrderCount = await Order.countDocuments({
      businessId: order.businessId,
      customerPhone: order.customerPhone
    });
    
    const customerTotalSpendRes = await Order.aggregate([
      { $match: { businessId: order.businessId, customerPhone: order.customerPhone, paymentStatus: 'PAID' } },
      { $group: { _id: null, totalSpendPaise: { $sum: '$totalAmountPaise' } } }
    ]);
    
    const customerTotalSpendPaise = customerTotalSpendRes[0]?.totalSpendPaise || 0;

    return res.json({
      success: true,
      data: {
        order,
        customerStats: {
          previousOrdersCount: customerOrderCount,
          lifetimeSpendPaise: customerTotalSpendPaise
        },
        business: business ? {
          name: business.name,
          slug: business.slug,
          logoUrl: business.logoUrl,
          currencySymbol: business.currencySymbol,
          address: business.address,
          phone: business.phone,
          taxRatePercentage: business.taxRatePercentage
        } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: List & Search Orders with Pagination & Filtering
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, paymentStatus, paymentMethod, q, page, limit, startDate, endDate } = req.query;
    const query: any = { businessId: req.businessId };

    if (status && status !== 'ALL') {
      query.orderStatus = status;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      query.paymentStatus = paymentStatus;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      query.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Instant Search across orderId, orderNumber, customerName, customerPhone, tableName, transactionId
    if (q && (q as string).trim() !== '') {
      const searchRegex = new RegExp((q as string).trim(), 'i');
      query.$or = [
        { orderId: searchRegex },
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { tableName: searchRegex },
        { transactionId: searchRegex }
      ];
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 25;
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Fast Order Search Endpoint
export const searchOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || (q as string).trim() === '') {
      return res.json({ success: true, data: [] });
    }

    const searchRegex = new RegExp((q as string).trim(), 'i');
    const orders = await Order.find({
      businessId: req.businessId,
      $or: [
        { orderId: searchRegex },
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
        { tableName: searchRegex },
        { transactionId: searchRegex }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ success: true, data: orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Update Order Status
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid order status specified.' }
      });
    }

    let order = await Order.findOne({ _id: id, businessId: req.businessId });
    if (!order) {
      order = await Order.findOne({ orderId: id, businessId: req.businessId });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    }

    order.orderStatus = status;
    if (status === 'COMPLETED' || status === 'SERVED') {
      order.paymentStatus = 'PAID';
    }

    // Update timeline timestamp
    if (!order.timeline) order.timeline = {};
    if (status === 'CONFIRMED') order.timeline.acceptedAt = new Date();
    if (status === 'PREPARING') order.timeline.preparingAt = new Date();
    if (status === 'READY') order.timeline.readyAt = new Date();
    if (status === 'COMPLETED') order.timeline.completedAt = new Date();
    if (status === 'CANCELLED') order.timeline.cancelledAt = new Date();

    await order.save();

    // Deduct stock if order is COMPLETED or CONFIRMED (Automatic BOM Deduction)
    if (status === 'COMPLETED' || status === 'CONFIRMED') {
      for (const item of order.items) {
        const recipe = await Recipe.findOne({ productId: item.productId, businessId: req.businessId });
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          for (const ing of recipe.ingredients) {
            const totalQuantityNeeded = ing.quantityRequired * item.quantity;

            const invItem = await InventoryItem.findById(ing.inventoryItemId);
            if (invItem) {
              invItem.currentStock = Math.max(0, invItem.currentStock - totalQuantityNeeded);
              if (invItem.currentStock <= invItem.minimumStockLevel) {
                invItem.status = invItem.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
              } else {
                invItem.status = 'IN_STOCK';
              }
              await invItem.save();

              await InventoryTransaction.create({
                businessId: req.businessId,
                inventoryItemId: invItem._id,
                type: 'USAGE_AUTO',
                quantityChanged: -totalQuantityNeeded,
                balanceAfter: invItem.currentStock,
                reason: `Automatic BOM deduction for Order ${order.orderId}`,
                referenceOrderId: order._id
              });
            }
          }
        }
      }
    }

    // Emit real-time status update
    emitToOrder(order._id.toString(), 'order:status_updated', {
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });

    emitToBusiness(req.businessId!.toString(), 'order:updated', {
      orderId: order.orderId,
      orderStatus: order.orderStatus
    });

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Fetch Digital E-Bill Data
export const getOrderBill = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let order = await Order.findById(id);
    if (!order) {
      order = await Order.findOne({ orderId: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }

    const business = await Business.findById(order.businessId);

    return res.json({
      success: true,
      data: {
        billNumber: order.orderId,
        orderId: order.orderId,
        date: order.createdAt,
        business: {
          name: business?.name || 'Business',
          address: business?.address || 'Mumbai, India',
          phone: business?.phone || '+91 9876543210',
          currencySymbol: business?.currencySymbol || '₹',
          taxRatePercentage: business?.taxRatePercentage || 5
        },
        customer: {
          name: order.customerName,
          phone: order.customerPhone
        },
        table: order.tableName,
        items: order.items,
        subtotalPaise: order.subtotalPaise,
        taxPaise: order.taxPaise,
        totalAmountPaise: order.totalAmountPaise,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        transactionId: order.transactionId || 'N/A'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
