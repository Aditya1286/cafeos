import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { Business } from '../models/Business';
import { Table } from '../models/Table';
import { Recipe } from '../models/Recipe';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { FinancialLedger } from '../models/FinancialLedger';
import { emitToBusiness, emitToOrder, emitToAdminOrders } from '../websocket/socketManager';
import { computeRefundInsights } from '../services/refundInsights.service';
import { prepareOrder, placeOrder, recordOrderPaymentLedger, markOrderPaid } from '../services/orderPlacement.service';
import { handleServiceError } from '../utils/serviceError';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Public customer endpoints identify an order ONLY by its Mongo _id — the unguessable value
// the tracking URL carries. The human-readable orderId (ART-250926-0001) is a per-day
// sequence, so accepting it here would let anyone enumerate every café's orders (customer
// names, phones, amounts) and cancel/mark-paid them. Staff endpoints may still use it, but
// always scoped to their business (findOrderForBusiness / findOrderForStaff).
const findOrderByPublicId = (id: unknown) =>
  typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id) ? Order.findById(id) : Promise.resolve(null);

// Public: Place Order (Guest Customer scanning QR code). All checks, pricing and writes live in
// services/orderPlacement.service.ts, shared with SMEPay checkout (which calls the same two steps
// but only places the order once the payment is confirmed).
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { qrToken, businessSlug, customerName, customerPhone, items, paymentMethod, idempotencyKey, notes } = req.body;

    // Online checkout goes through /public/checkout, which only creates the order once SMEPay
    // has confirmed the payment — never accept it as a plain, unpaid order here.
    if (paymentMethod === 'CHECKOUT') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Online checkout orders are placed through /public/checkout.' }
      });
    }

    // 1. Idempotency Check — a retry of the same submission carries the same phone, so the
    // lookup is scoped to it: a key alone must never hand back someone else's order.
    if (idempotencyKey !== undefined && typeof idempotencyKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'idempotencyKey must be a string.' }
      });
    }
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey, customerPhone: String(customerPhone || '') });
      if (existingOrder) {
        return res.json({
          success: true,
          message: 'Order retrieved via Idempotency-Key',
          data: existingOrder
        });
      }
    }

    const prepared = await prepareOrder({ qrToken, businessSlug, customerName, customerPhone, items, notes });
    const order = await placeOrder({
      ...prepared,
      paymentMethod: paymentMethod || 'ONLINE',
      paymentStatus: 'UNPAID',
      idempotencyKey
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// Public: Customer self-reports that they completed the UPI payment on their end.
// There's no gateway webhook in this flow (v1), so this is informational only —
// it never flips paymentStatus to PAID, it just timestamps the claim so the
// business knows to check their own UPI app/bank before handing the order over.
export const markOrderPaidByCustomer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await findOrderByPublicId(id);

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
    const order = await findOrderByPublicId(id);

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
      orderStatus: order.orderStatus,
      tableId: order.tableId || null,
      tableStatus: order.tableId ? 'AVAILABLE' : null
    });
    emitToAdminOrders('admin_order:updated', { _id: order._id.toString(), status: order.orderStatus });

    return res.json({ success: true, message: 'Order cancelled.', data: order });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Public: Customer requests a refund on an order that was already paid, then cancelled (by the
// business — self-cancel above only ever fires pre-payment). This doesn't move any money itself
// (there's no payment gateway to do that through) — it just flags the request for the business
// to action from their dashboard, the same request-then-confirm pattern used for remittances.
export const requestOrderRefund = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = await findOrderByPublicId(id);

    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }

    if (order.orderStatus !== 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ORDER_NOT_CANCELLED', message: 'A refund can only be requested for a cancelled order.' }
      });
    }
    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({
        success: false,
        error: { code: 'NOTHING_TO_REFUND', message: 'This order was never paid, so there is nothing to refund.' }
      });
    }

    // Idempotent — a double-tap or page refresh just returns the existing request instead of
    // erroring or resetting the timestamp.
    if (!order.refundRequestedAt) {
      order.refundRequestedAt = new Date();
      order.refundReason = (reason || '').toString().slice(0, 500);
      await order.save();

      emitToBusiness(order.businessId.toString(), 'order:refund_requested', {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        refundRequestedAt: order.refundRequestedAt
      });
    }

    return res.json({ success: true, message: 'Refund requested — the business will process this and confirm here.', data: order });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Public/Owner: Get Single Order Details by ID or orderId
// Public: the customer tracking page — by _id only (see findOrderByPublicId).
export const getPublicOrderById = async (req: Request, res: Response) => {
  try {
    const order = await findOrderByPublicId(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }
    return await sendOrderDetails(res, order);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: order details drawer — _id or human orderId, but only within their business.
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await findOrderForStaff(req.params.id, req);
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }
    return await sendOrderDetails(res, order);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

const sendOrderDetails = async (res: Response, order: InstanceType<typeof Order>) => {
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

// Owner/Staff: Cancelled & refunded orders in one dedicated list — the "Refunds &
// Cancellations" tab. Same search shape as getOrders above, just pre-scoped to the
// statuses that tab cares about, and with the staff member who processed a refund
// populated in so the history view can show who actioned it.
export const getRefundOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { q, paymentStatus, page, limit } = req.query;
    const query: any = { businessId: req.businessId, orderStatus: { $in: ['CANCELLED', 'REFUNDED'] } };

    if (paymentStatus && paymentStatus !== 'ALL') {
      query.paymentStatus = paymentStatus;
    }

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
        .populate('refundedByUserId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Precomputed refund/cancellation insights for this business — every
// figure is a real aggregation over the same Order fields the list above reads.
export const getRefundInsights = async (req: AuthRequest, res: Response) => {
  try {
    const insights = await computeRefundInsights({ businessId: req.businessId });
    return res.json({ success: true, data: insights });
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
const VALID_ORDER_STATUSES: OrderStatus[] = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

// Kitchen staff work orders through their lifecycle; confirming a refund was sent is money
// handling, left to the owner/manager.
const STAFF_FORBIDDEN_STATUSES: OrderStatus[] = ['REFUNDED'];
const forbiddenForRole = (req: AuthRequest, status: OrderStatus) =>
  req.user?.role === 'STAFF' && STAFF_FORBIDDEN_STATUSES.includes(status);


interface StatusChangeResult {
  success: boolean;
  order?: InstanceType<typeof Order>;
  errorCode?: string;
  errorMessage?: string;
}

// The full side-effect chain for one order's status transition — timeline stamps, refund
// ledger entry, table release, payment ledger entries, automatic BOM stock deduction, and both
// socket broadcasts. Pulled out of updateOrderStatus so bulkUpdateOrderStatus can apply the
// exact same behavior per order instead of a thinner, silently-diverging copy — returns a
// result object rather than throwing/responding, so a bulk caller can keep going past one
// order's failure and report it alongside the others.
const applyOrderStatusChange = async (
  order: InstanceType<typeof Order>,
  status: OrderStatus,
  businessId: string,
  userId?: string
): Promise<StatusChangeResult> => {
  // A refund only makes sense for money that was actually collected, and only once the
  // order itself is cancelled (no point refunding an order that's still being served).
  if (status === 'REFUNDED') {
    if (order.paymentStatus !== 'PAID') {
      return { success: false, errorCode: 'NOTHING_TO_REFUND', errorMessage: 'This order was never marked as paid, so there is nothing to refund.' };
    }
    if (order.orderStatus !== 'CANCELLED') {
      return { success: false, errorCode: 'ORDER_NOT_CANCELLED', errorMessage: 'Only a cancelled order can be marked as refunded.' };
    }
  }

  const wasAlreadyPaid = order.paymentStatus === 'PAID';

  order.orderStatus = status;
  if (status === 'COMPLETED' || status === 'SERVED') {
    order.paymentStatus = 'PAID';
  }
  if (status === 'REFUNDED') {
    order.paymentStatus = 'REFUNDED';
    order.refundedAt = new Date();
    order.refundedByUserId = userId as any;
  }

  // Update timeline timestamp
  if (!order.timeline) order.timeline = {};
  if (status === 'CONFIRMED') order.timeline.acceptedAt = new Date();
  if (status === 'PREPARING') order.timeline.preparingAt = new Date();
  if (status === 'READY') order.timeline.readyAt = new Date();
  if (status === 'COMPLETED') order.timeline.completedAt = new Date();
  if (status === 'CANCELLED') order.timeline.cancelledAt = new Date();

  await order.save();

  // Record the money leaving, mirroring the ORDER_PAYMENT/PLATFORM_FEE entries written below
  // when it first came in — same manual-transfer caveat: this logs that a refund happened,
  // it doesn't move the money itself.
  if (status === 'REFUNDED') {
    await FinancialLedger.create({
      transactionId: `TXN_REFUND_${uuidv4().substring(0, 10).toUpperCase()}`,
      businessId: order.businessId,
      orderId: order._id,
      type: 'REFUND',
      amountPaise: order.totalAmountPaise,
      currency: 'INR',
      status: 'SUCCESS',
      metadata: { orderNumber: order.orderNumber, customerName: order.customerName }
    });
  }

  // Free the table back up once its order reaches a terminal state, so the
  // one-active-order-per-table limit in createOrder doesn't lock it forever.
  if (order.tableId && ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status)) {
    await Table.findByIdAndUpdate(order.tableId, { status: 'AVAILABLE' });
  }

  if (!wasAlreadyPaid && order.paymentStatus === 'PAID') {
    await recordOrderPaymentLedger(order);
  }

  // Deduct stock if order is COMPLETED or CONFIRMED (Automatic BOM Deduction)
  if (status === 'COMPLETED' || status === 'CONFIRMED') {
    for (const item of order.items) {
      const recipe = await Recipe.findOne({ productId: item.productId, businessId });
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
              businessId,
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
    paymentStatus: order.paymentStatus,
    refundedAt: order.refundedAt
  });

  const tableWasFreed = !!order.tableId && ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(status);
  emitToBusiness(businessId, 'order:updated', {
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    tableId: order.tableId || null,
    // Only set when this update actually freed the table — most status
    // transitions (PLACED -> CONFIRMED -> PREPARING -> READY) leave it
    // occupied, so there's nothing new to tell the dashboard about it.
    tableStatus: tableWasFreed ? 'AVAILABLE' : undefined
  });
  emitToAdminOrders('admin_order:updated', { _id: order._id.toString(), status: order.orderStatus });

  return { success: true, order };
};

// findOrderForBusiness for a staff request: scoped to the caller's business; only a
// SUPER_ADMIN without an x-business-id header (enforceBusiness leaves businessId unset) may
// look an order up across all businesses.
const findOrderForStaff = async (id: string, req: AuthRequest) => {
  if (req.businessId) return findOrderForBusiness(id, req.businessId.toString());
  if (req.user?.role !== 'SUPER_ADMIN') return null;
  const order = mongoose.Types.ObjectId.isValid(id) ? await Order.findById(id) : null;
  return order || Order.findOne({ orderId: id });
};

const findOrderForBusiness = async (id: string, businessId: string) => {
  // Mongoose's findOne({ _id }) throws (not just "no match") when the value isn't a valid
  // ObjectId shape, so this has to check validity before trying the _id lookup at all —
  // otherwise every caller passing the human-readable orderId (e.g. "ART-120926-0001") 500s
  // instead of falling through to the orderId lookup below.
  let order = mongoose.Types.ObjectId.isValid(id)
    ? await Order.findOne({ _id: id, businessId })
    : null;
  if (!order) {
    order = await Order.findOne({ orderId: id, businessId });
  }
  return order;
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid order status specified.' }
      });
    }
    if (forbiddenForRole(req, status)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner or a manager can mark an order refunded.' } });
    }

    const order = await findOrderForBusiness(id, req.businessId!.toString());
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    }

    const result = await applyOrderStatusChange(order, status, req.businessId!.toString(), req.user?._id?.toString());
    if (!result.success) {
      return res.status(400).json({ success: false, error: { code: result.errorCode, message: result.errorMessage } });
    }

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: result.order
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Bulk-accept (or otherwise bulk-transition) several orders in one request — the
// "select all in New Orders, review, then accept" flow. Applies the exact same per-order logic
// as updateOrderStatus above and keeps going past an individual order's failure so one stale or
// already-actioned order in the batch doesn't block the rest.
const MAX_BULK_ORDERS = 50;

export const bulkUpdateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { orderIds, status } = req.body;

    if (!VALID_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid order status specified.' } });
    }
    if (forbiddenForRole(req, status)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the owner or a manager can mark an order refunded.' } });
    }
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'orderIds must be a non-empty array.' } });
    }
    if (orderIds.length > MAX_BULK_ORDERS) {
      return res.status(400).json({ success: false, error: { code: 'TOO_MANY_ORDERS', message: `You can update at most ${MAX_BULK_ORDERS} orders at once.` } });
    }

    const businessId = req.businessId!.toString();
    const userId = req.user?._id?.toString();
    const updated: any[] = [];
    const failed: { orderId: string; message: string }[] = [];

    for (const id of orderIds as string[]) {
      const order = await findOrderForBusiness(id, businessId);
      if (!order) {
        failed.push({ orderId: id, message: 'Order not found.' });
        continue;
      }

      const result = await applyOrderStatusChange(order, status, businessId, userId);
      if (result.success) {
        updated.push(result.order);
      } else {
        failed.push({ orderId: id, message: result.errorMessage || 'Could not update this order.' });
      }
    }

    return res.json({
      success: true,
      message: `${updated.length} order${updated.length === 1 ? '' : 's'} updated${failed.length ? `, ${failed.length} failed` : ''}.`,
      data: { updated, failed }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Manually confirm an order's payment — independent of order status. Covers cash
// handed over at the counter (which has no self-report flow at all) and an online payment the
// customer claims (`customerMarkedPaidAt`) but which hasn't been verified yet, without forcing
// the order to SERVED/COMPLETED just to flip paymentStatus (the only other path that does it).
export const confirmOrderPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let order = mongoose.Types.ObjectId.isValid(id)
      ? await Order.findOne({ _id: id, businessId: req.businessId })
      : null;
    if (!order) {
      order = await Order.findOne({ orderId: id, businessId: req.businessId });
    }
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    }

    if (order.paymentStatus === 'PAID') {
      return res.json({ success: true, message: 'This order is already marked as paid.', data: order });
    }
    if (order.paymentStatus === 'REFUNDED') {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_REFUNDED', message: 'This order was already refunded and cannot be marked paid again.' }
      });
    }

    const paidOrder = await markOrderPaid(order._id, { userId: req.user?._id });
    if (!paidOrder) {
      // Lost a race with another confirmation (or an SMEPay payment) — report the current state.
      const current = await Order.findById(order._id);
      return res.json({ success: true, message: 'This order is already marked as paid.', data: current });
    }

    return res.json({ success: true, message: 'Payment confirmed.', data: paidOrder });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

// Owner/Staff: Fetch Digital E-Bill Data
export const getOrderBill = async (req: AuthRequest, res: Response) => {
  try {
    // The dashboard's "View Bill" passes the human-readable orderId first; findOrderForStaff
    // accepts either id but only within the caller's business (bills carry customer phones).
    const order = await findOrderForStaff(req.params.id, req);

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
          taxRatePercentage: business?.taxRatePercentage ?? 0
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
