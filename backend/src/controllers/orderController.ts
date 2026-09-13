import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { Business } from '../models/Business';
import { Table } from '../models/Table';
import { Product } from '../models/Product';
import { Recipe } from '../models/Recipe';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { FinancialLedger } from '../models/FinancialLedger';
import { emitToBusiness, emitToOrder } from '../websocket/socketManager';
import { generateDailyOrderId } from '../utils/orderSequence';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Public: Place Order (Guest Customer scanning QR code)
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { qrToken, businessSlug, customerName, customerPhone, items, paymentMethod, idempotencyKey, notes } = req.body;

    if ((!qrToken && !businessSlug) || !customerName || !customerPhone || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'A table token (or business), customer details, and at least one item are required.' }
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

    // 2. Resolve Table (if provided) & Business
    let table = null;
    let business;

    if (qrToken) {
      table = await Table.findOne({ qrToken });
      if (!table) {
        return res.status(404).json({
          success: false,
          error: { code: 'TABLE_NOT_FOUND', message: 'Invalid or inactive table QR code token.' }
        });
      }
      business = await Business.findById(table.businessId);
    } else {
      business = await Business.findOne({ slug: String(businessSlug).toLowerCase() });
      if (!business) {
        return res.status(404).json({
          success: false,
          error: { code: 'BUSINESS_NOT_FOUND', message: 'Business not found.' }
        });
      }
      if (business.tablesEnabled) {
        return res.status(400).json({
          success: false,
          error: { code: 'TABLE_REQUIRED', message: 'This business requires a table — please scan your table\'s QR code to order.' }
        });
      }
    }

    if (!business || business.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: { code: 'BUSINESS_INACTIVE', message: 'This business is currently inactive.' }
      });
    }

    // A table can only host one active order at a time, so the number of
    // concurrently-occupied tables never exceeds the tables that actually
    // exist — reject a new order on a table that's still mid-service.
    if (table) {
      const activeOrderOnTable = await Order.findOne({
        tableId: table._id,
        orderStatus: { $nin: ['COMPLETED', 'CANCELLED', 'REFUNDED'] }
      });
      if (activeOrderOnTable) {
        return res.status(409).json({
          success: false,
          error: { code: 'TABLE_OCCUPIED', message: 'This table already has an active order in progress. Please wait for it to be completed, or ask staff for assistance.' }
        });
      }
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

    // Calculate Tax & Platform Commission
    const taxPaise = Math.round((subtotalPaise * (business.taxRatePercentage || 5)) / 100);
    // Commission is charged on the pre-tax order value (discountPaise reserved for a future
    // discount feature — always 0 today, included so commission stays correct once one ships).
    const discountPaise = 0;
    const commissionableAmountPaise = subtotalPaise - discountPaise;
    const platformFeePaise = Math.round((commissionableAmountPaise * (business.commissionRatePercentage ?? 3)) / 100);
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
      tableId: table ? table._id : undefined,
      tableName: table ? table.tableNumber : 'Counter',
      customerName,
      customerPhone,
      source: table ? 'QR_TABLE' : 'TAKEAWAY',
      items: itemSnapshots,
      subtotalPaise,
      taxPaise,
      platformFeePaise,
      totalAmountPaise,
      businessEarningsPaise,
      orderStatus: 'PLACED',
      // There's no payment gateway webhook in this flow (v1), so an ONLINE order
      // can't be trusted as paid just because the customer chose that method —
      // it stays UNPAID until the business confirms receipt themselves (see
      // markOrderPaidByCustomer for the customer's own "I've paid" signal, which
      // is informational only and never flips this field).
      paymentStatus: 'UNPAID',
      paymentMethod: paymentMethod || 'ONLINE',
      transactionId: '',
      idempotencyKey,
      notes: notes || '',
      timeline: { placedAt: new Date() }
    });

    // Update table status to occupied
    if (table) {
      table.status = 'OCCUPIED';
      await table.save();
    }

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

// Public: Customer self-reports that they completed the UPI payment on their end.
// There's no gateway webhook in this flow (v1), so this is informational only —
// it never flips paymentStatus to PAID, it just timestamps the claim so the
// business knows to check their own UPI app/bank before handing the order over.
export const markOrderPaidByCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderId: id });

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }

    if (order.paymentMethod !== 'ONLINE') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_ONLINE_ORDER', message: 'This order is not paid via online/UPI.' }
      });
    }

    if (order.paymentStatus === 'UNPAID') {
      order.customerMarkedPaidAt = new Date();
      await order.save();

      emitToBusiness(order.businessId.toString(), 'order:customer_marked_paid', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerMarkedPaidAt: order.customerMarkedPaidAt
      });
    }

    return res.json({ success: true, message: 'Thanks — the business will confirm your payment shortly.', data: order });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Public: Customer cancels their own order — only while it's still awaiting the
// business's acceptance, so the kitchen never loses an order mid-preparation.
export const cancelOrderByCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findById(id)
      : await Order.findOne({ orderId: id });

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }

    if (order.orderStatus !== 'PLACED') {
      const message = order.orderStatus === 'CANCELLED'
        ? 'This order is already cancelled.'
        : 'This order is already being prepared — please contact the business directly to cancel.';
      return res.status(400).json({ success: false, error: { code: 'CANNOT_CANCEL', message } });
    }

    order.orderStatus = 'CANCELLED';
    order.cancellationReason = 'Cancelled by customer before payment confirmation';
    if (!order.timeline) order.timeline = {};
    order.timeline.cancelledAt = new Date();
    await order.save();

    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
    }

    emitToOrder(order._id.toString(), 'order:status_updated', {
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });

    emitToBusiness(order.businessId.toString(), 'order:updated', {
      orderId: order.orderId,
      orderStatus: order.orderStatus
    });

    return res.json({ success: true, message: 'Order cancelled.', data: order });
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
          taxRatePercentage: business.taxRatePercentage,
          upiVpa: business.upiVpa
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

    const wasAlreadyPaid = order.paymentStatus === 'PAID';

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

    // Free the table back up once its order reaches a terminal state, so the
    // one-active-order-per-table limit in createOrder doesn't lock it forever.
    if (order.tableId && ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
    }

    // Money never flows through the platform (UPI goes to the business's own VPA, cash stays
    // with the business), so the moment an order is genuinely paid for the first time, record
    // the gross amount and the commission owed — this is what GMV/fee dashboards and remittance
    // accrual read from. Guarded by wasAlreadyPaid so re-saving an already-PAID order never
    // double-writes the ledger.
    if (!wasAlreadyPaid && order.paymentStatus === 'PAID') {
      const gatewayRef = `order_${order.orderId}`;
      await FinancialLedger.create({
        transactionId: `TXN_PAY_${uuidv4().substring(0, 10).toUpperCase()}`,
        businessId: order.businessId,
        orderId: order._id,
        type: 'ORDER_PAYMENT',
        amountPaise: order.totalAmountPaise,
        currency: 'INR',
        status: 'SUCCESS',
        paymentGatewayRef: gatewayRef,
        metadata: { orderNumber: order.orderNumber, customerName: order.customerName }
      });

      await FinancialLedger.create({
        transactionId: `TXN_FEE_${uuidv4().substring(0, 10).toUpperCase()}`,
        businessId: order.businessId,
        orderId: order._id,
        type: 'PLATFORM_FEE',
        amountPaise: order.platformFeePaise,
        currency: 'INR',
        status: 'SUCCESS',
        paymentGatewayRef: gatewayRef,
        metadata: { orderNumber: order.orderNumber, commissionRate: '3%' }
      });
    }

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
