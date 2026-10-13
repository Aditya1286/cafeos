import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { BUCKET_FORMAT, BucketGrain, OrderScope, orderFactsStages } from './analytics.dao';

// Customer queries: who ordered, when they first did, and how often.

export interface CustomerActivity {
  phone: string;
  name: string;
  orders: number;
  /** Net sales in paise. */
  spent: number;
}

/** Customers with at least one matching order in the scope, with their visits (orders) and spend there. */
export const customerRangeActivity = async (s: OrderScope): Promise<CustomerActivity[]> => {
  const rows = await Order.aggregate([
    ...orderFactsStages(s),
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$customerPhone', name: { $last: '$customerName' }, orders: { $sum: 1 }, spent: { $sum: '$sales' } } },
  ]).allowDiskUse(true);
  return rows.map((r) => ({ phone: r._id as string, name: (r.name as string) || 'Guest', orders: r.orders, spent: r.spent }));
};

/** Which customers were active in which business-local bucket (one row per customer per bucket). */
export const customerBucketActivity = async (s: OrderScope, grain: BucketGrain): Promise<{ key: string; phone: string }[]> => {
  const rows = await Order.aggregate([
    ...orderFactsStages(s),
    { $group: { _id: { key: { $dateToString: { format: BUCKET_FORMAT[grain], date: '$createdAt', timezone: s.timezone } }, phone: '$customerPhone' } } },
  ]);
  return rows.map((r) => ({ key: r._id.key as string, phone: r._id.phone as string }));
};

export interface CustomerLifetime {
  phone: string;
  name: string;
  first: Date;
  last: Date;
  orders: number;
  spent: number;
}

/** Every customer's revenue orders before `before`: first and last order, visits and total spend. */
export const customerLifetime = async (businessId: mongoose.Types.ObjectId, before: Date): Promise<CustomerLifetime[]> => {
  const rows = await Order.aggregate([
    { $match: { businessId, paymentStatus: 'PAID', orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] }, createdAt: { $lt: before } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: '$customerPhone',
        name: { $last: '$customerName' },
        first: { $min: '$createdAt' },
        last: { $max: '$createdAt' },
        orders: { $sum: 1 },
        spent: { $sum: { $subtract: [{ $ifNull: ['$subtotalPaise', 0] }, { $ifNull: ['$discountPaise', 0] }] } },
      },
    },
  ]).allowDiskUse(true);
  return rows.map((r) => ({ phone: r._id as string, name: (r.name as string) || 'Guest', first: r.first as Date, last: r.last as Date, orders: r.orders, spent: r.spent }));
};
