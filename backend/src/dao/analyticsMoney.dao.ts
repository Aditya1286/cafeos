import { Order } from '../models/Order';
import { BUCKET_FORMAT, BucketGrain, OrderScope, matchStage } from './analytics.dao';

// Money queries: cancellations, refunds, unpaid orders and GST.

export interface MoneyFacts {
  /** Every order placed in the scope, whatever happened to it. */
  orders: number;
  /** Orders that ended CANCELLED or REFUNDED. */
  cancelled: number;
  /** Total bill (paise) of orders whose payment was refunded. */
  refundedPaise: number;
  /** Total bill of paid-then-cancelled orders where the customer asked for a refund and it has not been sent yet. */
  refundPendingPaise: number;
  /** Total bill of orders that were served or completed but never paid for. */
  unpaidServedPaise: number;
  /** GST charged on revenue orders. */
  gstPaise: number;
}

const CANCELLED = ['CANCELLED', 'REFUNDED'];
const total = { $ifNull: ['$totalAmountPaise', 0] };

export const moneyFacts = async (s: OrderScope): Promise<MoneyFacts> => {
  const [row] = await Order.aggregate([
    matchStage(s),
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        cancelled: { $sum: { $cond: [{ $in: ['$orderStatus', CANCELLED] }, 1, 0] } },
        refunded: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'REFUNDED'] }, total, 0] } },
        refundPending: {
          $sum: {
            $cond: [{ $and: [{ $ne: [{ $ifNull: ['$refundRequestedAt', null] }, null] }, { $eq: [{ $ifNull: ['$refundedAt', null] }, null] }] }, total, 0],
          },
        },
        unpaidServed: {
          $sum: { $cond: [{ $and: [{ $in: ['$orderStatus', ['SERVED', 'COMPLETED']] }, { $eq: ['$paymentStatus', 'UNPAID'] }] }, total, 0] },
        },
        gst: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$paymentStatus', 'PAID'] }, { $not: [{ $in: ['$orderStatus', CANCELLED] }] }] }, { $ifNull: ['$taxPaise', 0] }, 0],
          },
        },
      },
    },
  ]);
  return {
    orders: row?.orders ?? 0,
    cancelled: row?.cancelled ?? 0,
    refundedPaise: row?.refunded ?? 0,
    refundPendingPaise: row?.refundPending ?? 0,
    unpaidServedPaise: row?.unpaidServed ?? 0,
    gstPaise: row?.gst ?? 0,
  };
};

/** Orders placed and orders cancelled per business-local hour or day. */
export const statusByBucket = async (s: OrderScope, grain: BucketGrain): Promise<{ key: string; orders: number; cancelled: number }[]> => {
  const rows = await Order.aggregate([
    matchStage(s),
    {
      $group: {
        _id: { $dateToString: { format: BUCKET_FORMAT[grain], date: '$createdAt', timezone: s.timezone } },
        orders: { $sum: 1 },
        cancelled: { $sum: { $cond: [{ $in: ['$orderStatus', CANCELLED] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ key: r._id as string, orders: r.orders, cancelled: r.cancelled }));
};

/** Why orders were cancelled: free-text reasons grouped ignoring case and spacing. '' = no reason given. */
export const cancelReasons = async (s: OrderScope, limit: number): Promise<{ reason: string; orders: number; paise: number }[]> => {
  const rows = await Order.aggregate([
    matchStage(s),
    { $match: { orderStatus: { $in: CANCELLED } } },
    {
      $group: {
        _id: { $toLower: { $trim: { input: { $ifNull: ['$cancellationReason', ''] } } } },
        orders: { $sum: 1 },
        paise: { $sum: total },
      },
    },
    { $sort: { orders: -1, paise: -1, _id: 1 } },
    { $limit: limit + 1 },
  ]);
  return rows.map((r) => ({ reason: r._id as string, orders: r.orders, paise: r.paise }));
};
