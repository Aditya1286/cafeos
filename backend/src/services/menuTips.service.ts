// Category tips for the mascot on the menu (spec §8.1, §8.3): per category, the dish with the most
// separate orders over the last POPULAR_WINDOW_DAYS (at least POPULAR_MIN_ORDERS), else the café's
// own house special in that category, else nothing. From real orders only, never fabricated.
//
// The order ranking (the expensive part) is cached per café for 10 minutes, like the popularity
// cache. Availability is applied fresh on every call, so a dish switched off or archived a minute
// ago is never named.
import mongoose from 'mongoose';
import { IBusiness } from '../models/Business';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { MASCOT_COPY, CopyLine } from '../constants/mascotCopy';
import { fillTemplate, TemplateValues } from './copyTemplates';
import { isIdentityOnFor } from './cafeIdentity.service';
import { POPULAR_WINDOW_DAYS, POPULAR_MIN_ORDERS } from './menuPopularity.service';

type BusinessLike = Pick<IBusiness, 'name'> & { _id: mongoose.Types.ObjectId; identity?: { enabled?: boolean } };

export type CategoryTip = { productId: string; line: string; kind: 'best-seller' | 'house-special' };

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { ranked: string[]; expiresAt: number }>();

/** Product ids with at least POPULAR_MIN_ORDERS separate orders in the window, most ordered first. */
const rankedProductIds = async (businessId: string): Promise<string[]> => {
  const cached = cache.get(businessId);
  if (cached && cached.expiresAt > Date.now()) return cached.ranked;

  const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows: { _id: mongoose.Types.ObjectId }[] = await Order.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(businessId),
        createdAt: { $gte: since },
        orderStatus: { $nin: ['CANCELLED', 'REFUNDED'] }
      }
    },
    { $unwind: '$items' },
    // One count per order, however many lines of the dish it has.
    { $group: { _id: { order: '$_id', product: '$items.productId' }, quantity: { $sum: '$items.quantity' } } },
    { $group: { _id: '$_id.product', orders: { $sum: 1 }, quantity: { $sum: '$quantity' } } },
    { $match: { orders: { $gte: POPULAR_MIN_ORDERS } } },
    { $sort: { orders: -1, quantity: -1, _id: 1 } }
  ]);
  const ranked = rows.map((r) => r._id.toString());
  cache.set(businessId, { ranked, expiresAt: Date.now() + CACHE_TTL_MS });
  return ranked;
};

// A stable pick per dish, so the line doesn't change on every menu load.
const lineFor = (bank: CopyLine[], seed: string, values: TemplateValues): string | null => {
  const start = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7) % bank.length;
  for (let i = 0; i < bank.length; i++) {
    const line = fillTemplate(bank[(start + i) % bank.length].text, values);
    if (line) return line;
  }
  return null;
};

export const getCategoryTips = async (business: BusinessLike): Promise<Record<string, CategoryTip>> => {
  if (!isIdentityOnFor(business)) return {};
  const businessId = business._id.toString();

  const [ranked, products, categories] = await Promise.all([
    rankedProductIds(businessId),
    Product.find({ businessId, isAvailable: true, isDeleted: { $ne: true } })
      .select('name categoryId isHouseSpecial displayOrder')
      .sort({ displayOrder: 1 }),
    Category.find({ businessId, isAvailable: true }).select('name')
  ]);
  const categoryName = new Map(categories.map((c) => [c._id.toString(), c.name]));
  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const tips: Record<string, CategoryTip> = {};
  for (const id of ranked) {
    const product = productById.get(id);
    const categoryId = product?.categoryId?.toString();
    if (!product || !categoryId || tips[categoryId] || !categoryName.has(categoryId)) continue;
    const line = lineFor(MASCOT_COPY.categoryTip, id, { category: categoryName.get(categoryId), dish: product.name, cafe: business.name });
    if (line) tips[categoryId] = { productId: id, line, kind: 'best-seller' };
  }
  for (const product of products) {
    const categoryId = product.categoryId?.toString();
    if (!product.isHouseSpecial || !categoryId || tips[categoryId] || !categoryName.has(categoryId)) continue;
    const id = product._id.toString();
    const line = lineFor(MASCOT_COPY.houseSpecialTip, id, { category: categoryName.get(categoryId), dish: product.name, cafe: business.name });
    if (line) tips[categoryId] = { productId: id, line, kind: 'house-special' };
  }
  return tips;
};

/** The generic first-visit line ("Welcome to {cafe}!"), or null if the café has no name. */
export const firstVisitLineFor = (business: Pick<IBusiness, 'name'>, random: () => number = Math.random): string | null => {
  const bank = MASCOT_COPY.firstVisit;
  const start = Math.floor(random() * bank.length) % bank.length;
  for (let i = 0; i < bank.length; i++) {
    const line = fillTemplate(bank[(start + i) % bank.length].text, { cafe: business.name });
    if (line) return line;
  }
  return null;
};

/** Test hook: forget cached rankings. */
export const clearCategoryTipCache = () => cache.clear();
