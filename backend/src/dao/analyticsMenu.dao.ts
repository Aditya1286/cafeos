import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { OrderScope, matchStage } from './analytics.dao';

// Menu queries: what sold, add-on use, and what has not.

export interface ItemSalesRow {
  productId: string;
  /** The name on the order lines (a snapshot); the live product name is preferred where the product still exists. */
  name: string;
  units: number;
  /** Item value in paise (including add-ons), before GST. */
  revenue: number;
}

const unwindItems = (s: OrderScope): mongoose.PipelineStage[] => [
  matchStage(s),
  { $unwind: '$items' },
  ...(s.productIds ? [{ $match: { 'items.productId': { $in: s.productIds } } } as mongoose.PipelineStage] : []),
];

/** Units and revenue per product over the matching orders' line items, biggest revenue first. */
export const itemSales = async (s: OrderScope): Promise<ItemSalesRow[]> => {
  const rows = await Order.aggregate([
    ...unwindItems(s),
    { $group: { _id: '$items.productId', name: { $last: '$items.name' }, units: { $sum: '$items.quantity' }, revenue: { $sum: '$items.itemTotalPaise' } } },
    { $sort: { revenue: -1 } },
  ]);
  return rows.map((r) => ({ productId: String(r._id), name: r.name as string, units: r.units, revenue: r.revenue }));
};

/** How many line items there were, and how many had at least one add-on. */
export const addonStats = async (s: OrderScope): Promise<{ lines: number; withAddons: number }> => {
  const [row] = await Order.aggregate([
    ...unwindItems(s),
    {
      $group: {
        _id: null,
        lines: { $sum: 1 },
        withAddons: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$items.addons', []] } }, 0] }, 1, 0] } },
      },
    },
  ]);
  return { lines: row?.lines ?? 0, withAddons: row?.withAddons ?? 0 };
};

/** When each product last sold (revenue orders, all time). Products that never sold are absent. */
export const lastSoldAtByProduct = async (businessId: mongoose.Types.ObjectId): Promise<Map<string, Date>> => {
  const rows = await Order.aggregate([
    { $match: { businessId, paymentStatus: 'PAID', orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', last: { $max: '$createdAt' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.last as Date]));
};

export const listProducts = (businessId: mongoose.Types.ObjectId) =>
  Product.find({ businessId }).select('name categoryId isVeg isAvailable isDeleted preparationTimeMinutes').lean();

export const listCategories = (businessId: mongoose.Types.ObjectId) => Category.find({ businessId }).select('name').lean();
