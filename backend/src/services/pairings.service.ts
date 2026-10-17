// "Goes well with your order" (spec §9.1): up to two dishes this café's guests most often order
// together with the dishes in this order, over the last 30 days. Real data only: a pair must have
// appeared together in at least PAIRING_MIN_ORDERS orders, and a "7 in 10" share is shown only when
// the base dish has at least PAIRING_SHARE_MIN_ORDERS qualifying orders. The co-occurrence counts
// are cached per café and order contents for 10 minutes; availability is applied fresh every time.
import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { MASCOT_COPY, CopyLine } from '../constants/mascotCopy';
import { fillTemplate, TemplateValues } from './copyTemplates';
import { POPULAR_WINDOW_DAYS, POPULAR_MIN_ORDERS } from './menuPopularity.service';

type OrderDoc = InstanceType<typeof Order>;

export const PAIRING_MIN_ORDERS = POPULAR_MIN_ORDERS;
export const PAIRING_SHARE_MIN_ORDERS = 20;
export const PAIRING_MAX_ITEMS = 2;
export const AMEND_MAX_PER_ORDER = 3;

export type Pairing = { productId: string; name: string; pricePaise: number; line: string; addable: boolean };

const CACHE_TTL_MS = 10 * 60 * 1000;
type Counts = {
  /** candidate product id → orders it shared with any base dish, and per base dish */
  pairs: { productId: string; orders: number; byBase: Record<string, number> }[];
  /** base product id → qualifying orders that include it */
  baseOrders: Record<string, number>;
};
const cache = new Map<string, { counts: Counts; expiresAt: number }>();

const coOrderCounts = async (order: OrderDoc, baseIds: string[]): Promise<Counts> => {
  const key = `${order.businessId}:${baseIds.join(',')}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.counts;

  const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const baseObjectIds = baseIds.map((id) => new mongoose.Types.ObjectId(id));
  // Each other order of this café that includes a base dish, reduced to the distinct dishes in it.
  const rows: { bases: mongoose.Types.ObjectId[]; others: mongoose.Types.ObjectId[] }[] = await Order.aggregate([
    {
      $match: {
        businessId: order.businessId,
        _id: { $ne: order._id },
        createdAt: { $gte: since },
        orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] },
        'items.productId': { $in: baseObjectIds }
      }
    },
    { $project: { products: { $setUnion: ['$items.productId', []] } } },
    {
      $project: {
        _id: 0,
        bases: { $setIntersection: ['$products', baseObjectIds] },
        others: { $setDifference: ['$products', baseObjectIds] }
      }
    }
  ]);

  const baseOrders: Record<string, number> = {};
  const pairs = new Map<string, { orders: number; byBase: Record<string, number> }>();
  for (const row of rows) {
    const bases = row.bases.map(String);
    for (const b of bases) baseOrders[b] = (baseOrders[b] ?? 0) + 1;
    for (const other of row.others.map(String)) {
      const entry = pairs.get(other) ?? { orders: 0, byBase: {} };
      entry.orders++;
      for (const b of bases) entry.byBase[b] = (entry.byBase[b] ?? 0) + 1;
      pairs.set(other, entry);
    }
  }
  const counts: Counts = {
    pairs: [...pairs.entries()]
      .filter(([, e]) => e.orders >= PAIRING_MIN_ORDERS)
      .sort(([idA, a], [idB, b]) => b.orders - a.orders || idA.localeCompare(idB))
      .map(([productId, e]) => ({ productId, ...e })),
    baseOrders
  };
  cache.set(key, { counts, expiresAt: Date.now() + CACHE_TTL_MS });
  return counts;
};

// A stable pick per dish, so the line doesn't change on every refresh of the tracker.
const lineFrom = (bank: CopyLine[], seed: string, values: TemplateValues): string | null => {
  const start = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % bank.length;
  for (let i = 0; i < bank.length; i++) {
    const line = fillTemplate(bank[(start + i) % bank.length].text, values);
    if (line) return line;
  }
  return null;
};

/**
 * "7 in 10" for the share of the base dish's orders that also had the pairing, rounded down so it
 * never overstates. Null below PAIRING_SHARE_MIN_ORDERS base orders, or when it rounds to nothing.
 */
export const shareText = (together: number, baseOrders: number): string | null => {
  if (baseOrders < PAIRING_SHARE_MIN_ORDERS || together <= 0) return null;
  const inTen = Math.floor((together / baseOrders) * 10);
  return inTen >= 1 ? `${Math.min(inTen, 10)} in 10` : null;
};

/**
 * Whether the guest may add to this order from the tracker (§9.1): still PLACED or PREPARING,
 * unpaid, not an online-checkout order, and under the amendment limit.
 * TODO(controller): replace with canAmend from orderAmendment.service
 */
export const isAmendable = (order: OrderDoc): boolean =>
  ['PLACED', 'PREPARING'].includes(order.orderStatus) &&
  order.paymentStatus === 'UNPAID' &&
  order.paymentMethod !== 'CHECKOUT' &&
  (order.amendments?.length ?? 0) < AMEND_MAX_PER_ORDER;

export const pairingsFor = async (order: OrderDoc): Promise<Pairing[]> => {
  const baseIds = [...new Set(order.items.map((i) => i.productId.toString()))].sort();
  if (!baseIds.length) return [];
  const counts = await coOrderCounts(order, baseIds);
  if (!counts.pairs.length) return [];

  const available = await Product.find({
    _id: { $in: counts.pairs.map((p) => p.productId) },
    businessId: order.businessId,
    isAvailable: true,
    isDeleted: { $ne: true }
  }).select('name pricePaise');
  const byId = new Map(available.map((p) => [p._id.toString(), p]));
  const addable = isAmendable(order);

  const result: Pairing[] = [];
  for (const pair of counts.pairs) {
    const product = byId.get(pair.productId);
    if (!product) continue;
    // The base dish it goes with best decides the share.
    const [base, together] = Object.entries(pair.byBase).sort(([, a], [, b]) => b - a)[0] ?? [];
    const share = base ? shareText(together, counts.baseOrders[base] ?? 0) : null;
    const line =
      (share && lineFrom(MASCOT_COPY.pairingShare, pair.productId, { dish: product.name, share })) ||
      lineFrom(MASCOT_COPY.pairing, pair.productId, { dish: product.name });
    if (!line) continue;
    result.push({ productId: pair.productId, name: product.name, pricePaise: product.pricePaise, line, addable });
    if (result.length >= PAIRING_MAX_ITEMS) break;
  }
  return result;
};

/** Test hook: forget cached counts. */
export const clearPairingCache = () => cache.clear();
