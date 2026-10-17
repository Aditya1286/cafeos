// The amend-order flow (spec §10.7): a guest adds dishes (today: a pairing from the tracker) to an
// order that is already placed. It follows the same money rules as placement, by reusing its two
// pricing helpers: the new lines are priced with priceItems, and the WHOLE order's totals are then
// recomputed with computeTotals on the new subtotal, so an amended order carries exactly the totals
// a fresh order with the same lines would.
//
// The financial ledger needs no write here: only UNPAID orders can be amended, and the ledger is
// written once, from the order's final totals, when the order is first paid
// (recordOrderPaymentLedger). So the amended total is what gets ledgered, exactly as placement would.
//
// Concurrency: the write is one findOneAndUpdate guarded on the status, the payment state and the
// exact amendments count and subtotal that were read. A kitchen status change, a payment, or a second
// amendment landing in between makes the guard miss, and the request fails with ORDER_NOT_AMENDABLE
// instead of writing totals computed from a stale order.
import { Order, IOrderAmendment } from '../models/Order';
import { Business } from '../models/Business';
import { priceItems, computeTotals } from './orderPlacement.service';
import { isIdentityOnFor } from './cafeIdentity.service';
import { deductIngredientsForOrder } from '../controllers/orderController';
import { emitToBusiness, emitToOrder } from '../websocket/socketManager';
import { verifyGuestPass } from '../utils/guestToken';
import { phoneKeyOf } from '../utils/phone';
import { ServiceError } from '../utils/serviceError';
import { LEGACY_CONFIRMED_STATUS } from '../utils/orderStatus';

type OrderDoc = InstanceType<typeof Order>;

/** At most this many amendments per order. */
export const AMEND_MAX_PER_ORDER = 3;
/** At most this many units added to one order across all its amendments. */
export const AMEND_MAX_UNITS = 10;

/** The statuses an order may be amended in, as stored (legacy CONFIRMED reads as PREPARING). */
const AMENDABLE_STORED_STATUSES = ['PLACED', 'PREPARING', LEGACY_CONFIRMED_STATUS];

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** Units already added to this order by earlier amendments. */
export const addedUnitsOf = (order: Pick<OrderDoc, 'amendments'>): number =>
  (order.amendments || []).reduce((sum, a) => sum + (a.items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);

/**
 * Whether this order can take another amendment at all: PLACED or PREPARING, UNPAID, not an online
 * checkout (SMEPay) order, and under both limits. The identity gate and the guest pass are checked
 * separately by amendOrder; the tracker uses this to decide between "Add" and "Ask your server".
 */
export const canAmend = (order: OrderDoc): boolean =>
  (order.orderStatus === 'PLACED' || order.orderStatus === 'PREPARING') &&
  order.paymentStatus === 'UNPAID' &&
  order.paymentMethod !== 'CHECKOUT' &&
  (order.amendments?.length ?? 0) < AMEND_MAX_PER_ORDER &&
  addedUnitsOf(order) < AMEND_MAX_UNITS;

/**
 * Test-only seam: runs between pricing and the guarded write, so a test can make a status change
 * land exactly there (the race the guard exists for). Never set outside tests.
 */
export const amendTestHooks: { afterPricing?: (orderId: string) => Promise<void> } = {};

const notAmendable = () =>
  new ServiceError(409, 'ORDER_NOT_AMENDABLE', 'This order can no longer be added to. Please ask your server.');

const validateItems = (items: unknown): { productId: string; quantity: number }[] => {
  if (!Array.isArray(items) || items.length === 0 || items.length > AMEND_MAX_UNITS) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Add at least one item.');
  }
  return items.map((raw) => {
    const item = raw as { productId?: unknown; quantity?: unknown };
    if (typeof item?.productId !== 'string' || !OBJECT_ID.test(item.productId)) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'Invalid item.');
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'Each item needs a whole quantity of at least 1.');
    }
    return { productId: item.productId, quantity: item.quantity };
  });
};

export interface AmendOrderParams {
  orderId: string; // the order's Mongo _id (public endpoints never take the human orderId)
  guestPass: unknown;
  items: { productId: string; quantity: number }[];
  source: 'pairing';
}

export const amendOrder = async (params: AmendOrderParams): Promise<OrderDoc> => {
  const { orderId, guestPass, source } = params;
  if (source !== 'pairing') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Unknown source.');
  }
  const items = validateItems(params.items);

  const order = typeof orderId === 'string' && OBJECT_ID.test(orderId) ? await Order.findById(orderId) : null;
  if (!order) {
    throw new ServiceError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }

  // Only the device that placed the order (it holds this café's pass for the order's phone) may add to it.
  const businessId = order.businessId.toString();
  const pass = verifyGuestPass(guestPass, businessId);
  const orderPhoneKey = phoneKeyOf(order.customerPhone);
  if (!pass || !orderPhoneKey || pass.phone !== orderPhoneKey) {
    throw new ServiceError(403, 'NOT_YOUR_ORDER', 'Only the phone that placed this order can add to it.');
  }

  const business = await Business.findById(order.businessId);
  if (!business || !isIdentityOnFor(business)) {
    throw new ServiceError(403, 'IDENTITY_OFF', 'Adding to an order is not available at this café.');
  }

  if (!canAmend(order)) throw notAmendable();
  const newUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  if (addedUnitsOf(order) + newUnits > AMEND_MAX_UNITS) {
    throw new ServiceError(400, 'AMEND_LIMIT', `At most ${AMEND_MAX_UNITS} items can be added to one order.`);
  }

  const priced = await priceItems(business, items);
  if (amendTestHooks.afterPricing) await amendTestHooks.afterPricing(orderId);

  const subtotalPaise = order.subtotalPaise + priced.subtotalPaise;
  const totals = computeTotals(business, subtotalPaise);
  const amendment: IOrderAmendment = {
    at: new Date(),
    source,
    items: priced.items,
    amountPaise: totals.totalAmountPaise - order.totalAmountPaise
  };
  const amendmentCount = order.amendments?.length ?? 0;

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      orderStatus: { $in: AMENDABLE_STORED_STATUSES },
      paymentStatus: 'UNPAID',
      paymentMethod: { $ne: 'CHECKOUT' },
      [`amendments.${AMEND_MAX_PER_ORDER - 1}`]: { $exists: false },
      // Optimistic concurrency: the totals above were computed from exactly this state.
      amendments: { $size: amendmentCount },
      subtotalPaise: order.subtotalPaise
    },
    {
      $push: { items: { $each: priced.items }, amendments: amendment },
      $set: { subtotalPaise, ...totals }
    },
    { new: true }
  );
  if (!updated) throw notAmendable();

  // The kitchen deducts stock when it takes an order on (it leaves PLACED). Lines added after that
  // would otherwise never come off the stock.
  if (updated.orderStatus !== 'PLACED') {
    await deductIngredientsForOrder({ _id: updated._id, orderId: updated.orderId, items: priced.items }, businessId).catch((err) =>
      console.error('[amend] Failed to deduct stock for added items:', err)
    );
  }

  // The status-change payload, plus the new lines and totals, so the kitchen board shows the added
  // lines (with their "Added" marker) and the tracker its new total without a refetch. No phone.
  const payload = {
    _id: updated._id.toString(),
    orderId: updated.orderId,
    orderStatus: updated.orderStatus,
    paymentStatus: updated.paymentStatus,
    tableId: updated.tableId || null,
    subtotalPaise: updated.subtotalPaise,
    taxPaise: updated.taxPaise,
    totalAmountPaise: updated.totalAmountPaise,
    businessEarningsPaise: updated.businessEarningsPaise,
    items: updated.toJSON().items,
    amendments: updated.toJSON().amendments,
    amended: true
  };
  emitToBusiness(businessId, 'order:updated', payload);
  emitToOrder(updated._id.toString(), 'order:updated', payload);

  return updated;
};
