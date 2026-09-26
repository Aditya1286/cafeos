// Customer order placement, shared by the normal public order flow (orderController.createOrder)
// and SMEPay checkout (checkout.service.ts), which prices the cart up front but only turns it into
// an Order once the payment is confirmed. Split in two for exactly that reason:
//
// - prepareOrder: every check + the price snapshot, no writes. Throws ServiceError with the same
//   codes createOrder has always returned.
// - placeOrder: the writes — daily order id, the Order itself, table occupancy, realtime emits.
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Order, PaymentMethod, PaymentStatus } from '../models/Order';
import { Business, IBusiness } from '../models/Business';
import { Table } from '../models/Table';
import { Product } from '../models/Product';
import { FinancialLedger } from '../models/FinancialLedger';
import { ICheckoutDraft } from '../models/CheckoutSession';
import { emitToBusiness, emitToOrder, emitToAdminOrders } from '../websocket/socketManager';
import { toAdminLiveOrder } from '../utils/adminLiveOrder';
import { generateDailyOrderId } from '../utils/orderSequence';
import { ServiceError } from '../utils/serviceError';
import { config } from '../config';
import { isPhoneOrderVerified, touchPhoneOrderVerification } from './otp.service';

type BusinessDoc = mongoose.HydratedDocument<IBusiness>;
type TableDoc = InstanceType<typeof Table>;
type OrderDoc = InstanceType<typeof Order>;

export interface OrderPlacementInput {
  qrToken?: string;
  businessSlug?: string;
  customerName?: string;
  customerPhone?: string;
  items?: any[];
  notes?: string;
}

export interface PreparedOrder {
  business: BusinessDoc;
  table: TableDoc | null;
  customerName: string;
  customerPhone: string;
  draft: ICheckoutDraft;
}

// Money never flows through the platform (UPI goes to the business's own VPA or its own SMEPay
// account, cash stays with the business), so the moment an order is genuinely paid for the first
// time — the kitchen marking it SERVED/COMPLETED, the business explicitly confirming payment, or
// SMEPay validating a checkout — this records the gross amount and the commission owed. This is
// what GMV/fee dashboards and remittance accrual read from. Callers must guard this themselves
// against firing on an order that was already PAID, so it never double-writes the ledger.
export const recordOrderPaymentLedger = async (order: OrderDoc) => {
  const gatewayRef = order.paymentProvider === 'SMEPAY' && order.transactionId
    ? `smepay_${order.transactionId}`
    : `order_${order.orderId}`;
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
};

export const prepareOrder = async (input: OrderPlacementInput): Promise<PreparedOrder> => {
  const { qrToken, businessSlug, customerName, customerPhone, items, notes } = input;

  if ((!qrToken && !businessSlug) || !customerName || !customerPhone || !items || !items.length) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'A table token (or business), customer details, and at least one item are required.');
  }
  // These go straight into Mongo filters — an object here ({"$ne": null}) would match any row.
  if ((qrToken !== undefined && typeof qrToken !== 'string') || typeof customerPhone !== 'string' || !Array.isArray(items)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Invalid order details.');
  }

  // The frontend gates order submission on completing phone OTP verification, but that's
  // only a UI convenience — without this, anyone could POST here directly and place orders
  // under any phone number without ever verifying it. isPhoneOrderVerified checks the
  // long-lived, reusable record otp.service sets on a successful /otp/verify call for this
  // exact phone (see touchPhoneOrderVerification in placeOrder, which slides that window
  // forward on every order so a repeat customer doesn't need to re-verify).
  if (!(await isPhoneOrderVerified(customerPhone))) {
    throw new ServiceError(400, 'PHONE_NOT_VERIFIED', 'Please verify your phone number with the OTP sent to it before placing an order.');
  }

  // Resolve Table (if provided) & Business
  let table: TableDoc | null = null;
  let business: BusinessDoc | null;

  if (qrToken) {
    table = await Table.findOne({ qrToken });
    if (!table) {
      throw new ServiceError(404, 'TABLE_NOT_FOUND', 'Invalid or inactive table QR code token.');
    }
    if (!table.isActive) {
      throw new ServiceError(403, 'TABLE_DISABLED', 'This table is temporarily unavailable. Please ask staff for assistance.');
    }
    business = await Business.findById(table.businessId);
  } else {
    business = await Business.findOne({ slug: String(businessSlug).toLowerCase() });
    if (!business) {
      throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
    }
    // No table in the link: fine when the business has no tables, or when its master QR is on
    // (the order becomes a counter order). `=== false` so a business saved before the setting
    // existed counts as on, like the schema default.
    if (business.tablesEnabled && business.masterQrEnabled === false) {
      throw new ServiceError(400, 'TABLE_REQUIRED', 'This business requires a table — please scan your table\'s QR code to order.');
    }
  }

  if (!business || business.status === 'SUSPENDED') {
    throw new ServiceError(403, 'BUSINESS_INACTIVE', 'This business is currently inactive.');
  }

  // A table can only host one active order at a time, so the number of
  // concurrently-occupied tables never exceeds the tables that actually
  // exist — reject a new order on a table that's still mid-service.
  if (table) {
    await assertTableFree(table);
  }

  // Process Items and build exact snapshots
  let subtotalPaise = 0;
  const itemSnapshots = [];

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, businessId: business._id });
    if (!product || !product.isAvailable) {
      throw new ServiceError(400, 'PRODUCT_UNAVAILABLE', `Item '${item.name || 'product'}' is currently unavailable.`);
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
  // `?? 0` not `|| 0` — kept nullish-coalescing (not that it matters at 0) so re-enabling
  // GST for a business is just setting taxRatePercentage back to a nonzero value later.
  const taxPaise = Math.round((subtotalPaise * (business.taxRatePercentage ?? 0)) / 100);
  // Commission is charged on the pre-tax order value (discountPaise reserved for a future
  // discount feature — always 0 today, included so commission stays correct once one ships).
  const discountPaise = 0;
  const commissionableAmountPaise = subtotalPaise - discountPaise;
  const platformFeePaise = Math.round((commissionableAmountPaise * (business.commissionRatePercentage ?? 3)) / 100);
  const totalAmountPaise = subtotalPaise + taxPaise;
  const businessEarningsPaise = totalAmountPaise - platformFeePaise;

  return {
    business,
    table,
    customerName,
    customerPhone,
    draft: {
      tableName: table ? table.tableNumber : 'Counter',
      source: table ? 'QR_TABLE' : 'TAKEAWAY',
      items: itemSnapshots,
      subtotalPaise,
      discountPaise,
      taxPaise,
      platformFeePaise,
      totalAmountPaise,
      businessEarningsPaise,
      notes: notes || ''
    }
  };
};

export const assertTableFree = async (table: TableDoc) => {
  const activeOrderOnTable = await Order.findOne({
    tableId: table._id,
    orderStatus: { $nin: ['COMPLETED', 'CANCELLED', 'REFUNDED'] }
  });
  if (activeOrderOnTable) {
    throw new ServiceError(409, 'TABLE_OCCUPIED', 'This table already has an active order in progress. Please wait for it to be completed, or ask staff for assistance.');
  }
};

export interface PlaceOrderParams {
  business: BusinessDoc;
  table: TableDoc | null;
  customerName: string;
  customerPhone: string;
  draft: ICheckoutDraft;
  paymentMethod: PaymentMethod;
  paymentStatus: Extract<PaymentStatus, 'UNPAID' | 'PAID'>;
  paymentProvider?: 'SMEPAY';
  transactionId?: string;
  checkoutSessionId?: mongoose.Types.ObjectId;
  idempotencyKey?: string;
}

export const placeOrder = async (params: PlaceOrderParams): Promise<OrderDoc> => {
  const { business, table, draft } = params;
  const paid = params.paymentStatus === 'PAID';

  // Generate Atomic Daily Order ID (e.g. ART-120926-0001)
  const { orderId, dateKey, sequenceNumber } = await generateDailyOrderId(business._id);

  const order = await Order.create({
    orderId,
    orderNumber: orderId,
    businessId: business._id,
    dateKey,
    sequenceNumber,
    tableId: table ? table._id : undefined,
    tableName: draft.tableName,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    source: draft.source,
    items: draft.items,
    subtotalPaise: draft.subtotalPaise,
    discountPaise: draft.discountPaise,
    taxPaise: draft.taxPaise,
    platformFeePaise: draft.platformFeePaise,
    totalAmountPaise: draft.totalAmountPaise,
    businessEarningsPaise: draft.businessEarningsPaise,
    orderStatus: 'PLACED',
    // Only an SMEPay-validated checkout arrives here already PAID. Everything else — ONLINE
    // (direct UPI) included — can't be trusted as paid just because the customer chose that
    // method: it stays UNPAID until the business confirms receipt themselves (see
    // markOrderPaidByCustomer for the customer's own "I've paid" signal, which is
    // informational only and never flips this field).
    paymentStatus: params.paymentStatus,
    paymentMethod: params.paymentMethod,
    paymentProvider: params.paymentProvider,
    transactionId: params.transactionId || '',
    checkoutSessionId: params.checkoutSessionId,
    paymentConfirmedAt: paid ? new Date() : undefined,
    idempotencyKey: params.idempotencyKey,
    notes: draft.notes,
    timeline: { placedAt: new Date() }
  });

  if (paid) {
    await recordOrderPaymentLedger(order);
  }

  // Update table status to occupied
  if (table) {
    table.status = 'OCCUPIED';
    await table.save();
  }

  // Trigger Realtime WebSocket Notification
  emitToBusiness(business._id.toString(), 'order:new', {
    _id: order._id,
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    tableId: table ? table._id : null,
    tableName: order.tableName,
    // Lets the owner dashboard flip this table to OCCUPIED in its own live
    // table list without a manual refresh — see order:updated for the
    // matching AVAILABLE signal when the order finishes.
    tableStatus: table ? 'OCCUPIED' : null,
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

  // Super Admin live feed. Demo businesses stay out of it whenever they're excluded from
  // platform analytics, matching the overview's recentOrders the feed starts from.
  if (!(config.excludeDemoBusinessesFromAnalytics && business.isDemo)) {
    emitToAdminOrders('admin_order:new', toAdminLiveOrder(order, business.name));
  }

  // The order is already saved — a failure to slide the verification window must not turn
  // that into a 500 (the customer would retry and hit the duplicate-order guard instead).
  await touchPhoneOrderVerification(params.customerPhone).catch((err) =>
    console.error('[otp] Failed to extend order verification window:', err)
  );

  return order;
};

export interface MarkOrderPaidParams {
  userId?: mongoose.Types.ObjectId; // staff member confirming by hand
  // Set when the money actually came through SMEPay (a customer who switched away from online
  // checkout, but whose payment went through after all).
  smepayTransactionId?: string;
}

/**
 * Flips an unpaid order to PAID exactly once, records the payment ledger and tells the order's
 * tracking page + the business dashboard. The compare-and-set on paymentStatus means two
 * concurrent callers (a double-clicked "Confirm payment", or staff confirming while SMEPay's
 * confirmation lands) can never write the ledger twice. Returns null if the order wasn't
 * payable anymore (already PAID/REFUNDED, or gone).
 */
export const markOrderPaid = async (orderId: mongoose.Types.ObjectId, params: MarkOrderPaidParams = {}): Promise<OrderDoc | null> => {
  const set: Record<string, unknown> = {
    paymentStatus: 'PAID',
    paymentConfirmedAt: new Date()
  };
  if (params.userId) set.paymentConfirmedByUserId = params.userId;
  if (params.smepayTransactionId !== undefined) {
    set.paymentMethod = 'CHECKOUT';
    set.paymentProvider = 'SMEPAY';
    set.transactionId = params.smepayTransactionId;
  }

  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $in: ['UNPAID', 'FAILED'] } },
    { $set: set },
    { new: true }
  );
  if (!order) return null;

  await recordOrderPaymentLedger(order);

  emitToOrder(order._id.toString(), 'order:status_updated', {
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus
  });
  emitToBusiness(order.businessId.toString(), 'order:updated', {
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    tableId: order.tableId || null
  });

  return order;
};
