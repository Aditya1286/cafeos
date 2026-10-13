import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { OrderScope, matchStage } from './analytics.dao';

// Kitchen queries: the timestamps behind prep and fulfilment times.

export interface KitchenOrderRow {
  createdAt: Date;
  timeline?: { placedAt?: Date; acceptedAt?: Date; preparingAt?: Date; readyAt?: Date; completedAt?: Date };
  productIds: mongoose.Types.ObjectId[];
}

/** The most orders one kitchen query reads. Beyond this the newest are used and the result says so. */
export const KITCHEN_SAMPLE_CAP = 20_000;

/** Timeline and product ids of the matching orders (newest first), capped so a huge range cannot exhaust memory. */
export const kitchenOrders = async (s: OrderScope, limit: number = KITCHEN_SAMPLE_CAP): Promise<{ rows: KitchenOrderRow[]; sampled: boolean }> => {
  const rows = await Order.aggregate([
    matchStage(s),
    { $sort: { createdAt: -1 } },
    { $limit: limit + 1 },
    { $project: { createdAt: 1, timeline: 1, items: { productId: 1 } } },
  ]);
  const sampled = rows.length > limit;
  return {
    sampled,
    rows: rows.slice(0, limit).map((r) => ({
      createdAt: r.createdAt as Date,
      timeline: r.timeline,
      productIds: ((r.items ?? []) as { productId: mongoose.Types.ObjectId }[]).map((i) => i.productId),
    })),
  };
};
