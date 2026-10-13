import mongoose from 'mongoose';
import { Order } from '../models/Order';

// Aggregation pipelines for the owner analytics. Pure query wrappers: the definitions (what counts
// as revenue, what "net sales" means) are decided by the metrics that call these, not here.

/** Which orders a query looks at. Built per metric by services/analytics/scope.ts. */
export interface OrderScope {
  businessId: mongoose.Types.ObjectId;
  timezone: string;
  /** [start, end) by Order.createdAt. */
  start: Date;
  end: Date;
  /** 'paid' = payment collected; 'any' = every order. */
  payment: 'paid' | 'any';
  /** Leave out CANCELLED and REFUNDED orders. */
  excludeCancelled: boolean;
  sources: string[];
  paymentMethods: string[];
  /** Business-local hours (0–23) the order must fall in, or null for any. */
  hours: number[] | null;
  /** Only these products count (item filters), or null for every line. An empty list matches nothing. */
  productIds: mongoose.Types.ObjectId[] | null;
}

export interface Totals {
  /** Net sales in paise: item value after discounts, before GST. */
  sales: number;
  orders: number;
  /** Units sold. */
  qty: number;
}

export const matchStage = (s: OrderScope) => {
  const match: Record<string, unknown> = {
    businessId: s.businessId,
    createdAt: { $gte: s.start, $lt: s.end },
  };
  if (s.payment === 'paid') match.paymentStatus = 'PAID';
  if (s.excludeCancelled) match.orderStatus = { $nin: ['CANCELLED', 'REFUNDED'] };
  if (s.sources.length) match.source = { $in: s.sources };
  if (s.paymentMethods.length) match.paymentMethod = { $in: s.paymentMethods };
  if (s.hours) match.$expr = { $in: [{ $hour: { date: '$createdAt', timezone: s.timezone } }, s.hours] };
  if (s.productIds) match['items.productId'] = { $in: s.productIds };
  return { $match: match };
};

/**
 * One row per matching order: `sales` (net of discount, ex-GST) and `qty`. Without item filters
 * that is the order's own subtotal; with them, only the matching lines count, and an order with no
 * matching line drops out (so "orders" means orders that contain a matching item).
 */
export const orderFactsStages = (s: OrderScope): mongoose.PipelineStage[] => {
  const keep = { createdAt: 1, source: 1, paymentMethod: 1, customerPhone: 1, customerName: 1 };
  if (!s.productIds) {
    return [
      matchStage(s),
      {
        $project: {
          ...keep,
          sales: { $subtract: [{ $ifNull: ['$subtotalPaise', 0] }, { $ifNull: ['$discountPaise', 0] }] },
          qty: { $sum: '$items.quantity' },
        },
      },
    ];
  }
  return [
    matchStage(s),
    { $project: { ...keep, items: { $filter: { input: '$items', as: 'line', cond: { $in: ['$$line.productId', s.productIds] } } } } },
    { $match: { 'items.0': { $exists: true } } },
    { $project: { ...keep, sales: { $sum: '$items.itemTotalPaise' }, qty: { $sum: '$items.quantity' } } },
  ];
};

export const orderTotals = async (s: OrderScope): Promise<Totals> => {
  const [row] = await Order.aggregate([
    ...orderFactsStages(s),
    { $group: { _id: null, sales: { $sum: '$sales' }, orders: { $sum: 1 }, qty: { $sum: '$qty' } } },
  ]);
  return { sales: row?.sales ?? 0, orders: row?.orders ?? 0, qty: row?.qty ?? 0 };
};

export type BucketGrain = 'hour' | 'day';
export const BUCKET_FORMAT: Record<BucketGrain, string> = { hour: '%Y-%m-%dT%H', day: '%Y-%m-%d' };

/** Totals per business-local hour ('2026-10-13T14') or day ('2026-10-13'), ascending. Empty buckets are absent. */
export const orderTotalsByBucket = async (s: OrderScope, grain: BucketGrain): Promise<(Totals & { key: string })[]> => {
  const rows = await Order.aggregate([
    ...orderFactsStages(s),
    {
      $group: {
        _id: { $dateToString: { format: BUCKET_FORMAT[grain], date: '$createdAt', timezone: s.timezone } },
        sales: { $sum: '$sales' },
        orders: { $sum: 1 },
        qty: { $sum: '$qty' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ key: r._id as string, sales: r.sales, orders: r.orders, qty: r.qty }));
};
