import { Order } from '../models/Order';

export interface PaymentMethodRefundBreakdown {
  _id: string;
  count: number;
  amountPaise: number;
}

export interface RefundInsights {
  /** Every order that ever reached CANCELLED, whether or not it's since been refunded (orderStatus flips to REFUNDED once it is — see applyOrderStatusChange). */
  totalCancellations: number;
  totalRefundedCount: number;
  totalRefundedAmountPaise: number;
  /** Cancelled + still paid — money the business owes back right now, regardless of whether the customer has formally asked for it. */
  needsRefundCount: number;
  /** Of `needsRefundCount`, how many the customer explicitly requested via the self-service flow. */
  refundRequestedCount: number;
  /** Cancelled orders that were never paid in the first place — no refund was ever needed. */
  unpaidCancellationsCount: number;
  /** Average hours between a customer's refund request and the business marking it refunded. null when no order has both timestamps yet. */
  avgRefundTurnaroundHours: number | null;
  paymentMethodBreakdown: PaymentMethodRefundBreakdown[];
}

/**
 * Every field here is computed straight from data the Order document already carries
 * (orderStatus, paymentStatus, refundRequestedAt, refundedAt) — nothing new to collect.
 * `matchBase` scopes the computation: pass `{ businessId }` for one business's view, or
 * `{}` / `{ businessId: { $in: [...] } }` for the platform-wide / filtered admin view.
 */
export const computeRefundInsights = async (matchBase: Record<string, any>): Promise<RefundInsights> => {
  const [
    totalCancellations,
    refundedAgg,
    needsRefundCount,
    refundRequestedCount,
    unpaidCancellationsCount,
    turnaroundAgg,
    paymentMethodBreakdown
  ] = await Promise.all([
    Order.countDocuments({ ...matchBase, orderStatus: { $in: ['CANCELLED', 'REFUNDED'] } }),
    Order.aggregate([
      { $match: { ...matchBase, paymentStatus: 'REFUNDED' } },
      { $group: { _id: null, count: { $sum: 1 }, amountPaise: { $sum: '$totalAmountPaise' } } }
    ]),
    Order.countDocuments({ ...matchBase, orderStatus: 'CANCELLED', paymentStatus: 'PAID' }),
    Order.countDocuments({ ...matchBase, orderStatus: 'CANCELLED', paymentStatus: 'PAID', refundRequestedAt: { $exists: true } }),
    Order.countDocuments({ ...matchBase, orderStatus: 'CANCELLED', paymentStatus: { $ne: 'PAID' } }),
    Order.aggregate([
      { $match: { ...matchBase, paymentStatus: 'REFUNDED', refundRequestedAt: { $exists: true }, refundedAt: { $exists: true } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$refundedAt', '$refundRequestedAt'] } } } }
    ]),
    Order.aggregate([
      { $match: { ...matchBase, paymentStatus: 'REFUNDED' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amountPaise: { $sum: '$totalAmountPaise' } } },
      { $sort: { amountPaise: -1 } }
    ])
  ]);

  const avgMs = turnaroundAgg[0]?.avgMs;

  return {
    totalCancellations,
    totalRefundedCount: refundedAgg[0]?.count || 0,
    totalRefundedAmountPaise: refundedAgg[0]?.amountPaise || 0,
    needsRefundCount,
    refundRequestedCount,
    unpaidCancellationsCount,
    avgRefundTurnaroundHours: avgMs != null ? Math.round((avgMs / (1000 * 60 * 60)) * 10) / 10 : null,
    paymentMethodBreakdown
  };
};
