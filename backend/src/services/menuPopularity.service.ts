import mongoose from 'mongoose';
import { Order } from '../models/Order';

// "Popular" tags on the customer menu come from real sales only: a café's best sellers over
// the last POPULAR_WINDOW_DAYS, and only items that at least POPULAR_MIN_ORDERS separate
// orders included — so a new café with three orders doesn't get random items labelled
// popular. Never fabricate this: it's shown to customers as a fact about the café.
export const POPULAR_WINDOW_DAYS = 30;
export const POPULAR_MIN_ORDERS = 5;
export const POPULAR_MAX_ITEMS = 4;

// Every customer menu load asks for this, so keep a short per-business cache instead of
// re-aggregating a month of orders on each QR scan. Rankings barely move within minutes.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { productIds: string[]; expiresAt: number }>();

export const getPopularProductIds = async (businessId: string): Promise<string[]> => {
  const cached = cache.get(businessId);
  if (cached && cached.expiresAt > Date.now()) return cached.productIds;

  const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  // Uses the {businessId, createdAt} index; a café's month is a few thousand orders at most.
  const ranked = await Order.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        createdAt: { $gte: since },
        orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] }
      }
    },
    { $unwind: '$items' },
    { $group: { _id: '$items.productId', orders: { $sum: 1 }, quantity: { $sum: '$items.quantity' } } },
    { $match: { orders: { $gte: POPULAR_MIN_ORDERS } } },
    { $sort: { orders: -1, quantity: -1 } },
    { $limit: POPULAR_MAX_ITEMS }
  ]);

  const productIds = ranked.map((r) => r._id.toString());
  cache.set(businessId, { productIds, expiresAt: Date.now() + CACHE_TTL_MS });
  return productIds;
};

/** Test hook: forget cached rankings. */
export const clearPopularityCache = () => cache.clear();
