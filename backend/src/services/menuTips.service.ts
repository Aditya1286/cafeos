// Category tips for the mascot on the menu (spec §8.1, §8.3): per category, the dish with the most
// separate orders over the last POPULAR_WINDOW_DAYS (at least POPULAR_MIN_ORDERS), else the café's
// own house special in that category, else its cheapest dish, else nothing. From real orders and the
// real menu only, never fabricated. A best seller is described from a different true angle per
// category and per day (most ordered, how many orders, how far ahead), so the tips don't repeat.
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

export type CategoryTip = { productId: string; line: string; kind: 'best-seller' | 'house-special' | 'value' };

type Ranked = { id: string; orders: number };

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { ranked: Ranked[]; expiresAt: number }>();
/** A dish "clearly outsells" the next one in its category at this many times its orders. */
const LEADER_RATIO = 1.5;
/** The cheapest-dish tip needs at least this many dishes in the category to mean anything. */
const VALUE_MIN_DISHES = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Products with at least POPULAR_MIN_ORDERS separate orders in the window, most ordered first. */
const rankedProducts = async (businessId: string): Promise<Ranked[]> => {
  const cached = cache.get(businessId);
  if (cached && cached.expiresAt > Date.now()) return cached.ranked;

  const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows: { _id: mongoose.Types.ObjectId; orders: number }[] = await Order.aggregate([
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
  const ranked = rows.map((r) => ({ id: r._id.toString(), orders: r.orders }));
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

const formatPrice = (paise: number): string => `₹${Number((paise / 100).toFixed(2))}`;

export const getCategoryTips = async (business: BusinessLike): Promise<Record<string, CategoryTip>> => {
  if (!isIdentityOnFor(business)) return {};
  const businessId = business._id.toString();

  const [ranked, products, categories] = await Promise.all([
    rankedProducts(businessId),
    Product.find({ businessId, isAvailable: true, isDeleted: { $ne: true } })
      .select('name categoryId isHouseSpecial displayOrder pricePaise')
      .sort({ displayOrder: 1 }),
    Category.find({ businessId, isAvailable: true }).select('name').sort({ displayOrder: 1 })
  ]);
  const categoryName = new Map(categories.map((c) => [c._id.toString(), c.name]));
  const productById = new Map(products.map((p) => [p._id.toString(), p]));
  // Position in the menu plus the day: moves each category along its list of true things to say.
  const position = new Map(categories.map((c, i) => [c._id.toString(), i]));
  const day = Math.floor(Date.now() / DAY_MS);

  const tips: Record<string, CategoryTip> = {};
  // Ranked best sellers per category, most ordered first (unavailable dishes are left out here).
  const leaders = new Map<string, Ranked[]>();
  for (const row of ranked) {
    const categoryId = productById.get(row.id)?.categoryId?.toString();
    if (!categoryId || !categoryName.has(categoryId)) continue;
    leaders.set(categoryId, [...(leaders.get(categoryId) ?? []), row]);
  }
  for (const [categoryId, rows] of leaders) {
    const [top, next] = rows;
    const product = productById.get(top.id)!;
    const values = { category: categoryName.get(categoryId), dish: product.name, cafe: business.name };
    const angles: CopyLine[][] = [MASCOT_COPY.categoryTip];
    angles.push(MASCOT_COPY.orderCountTip);
    if (next && top.orders >= next.orders * LEADER_RATIO) angles.push(MASCOT_COPY.leaderTip);
    const start = (position.get(categoryId) ?? 0) + day;
    for (let i = 0; i < angles.length && !tips[categoryId]; i++) {
      const bank = angles[(start + i) % angles.length];
      const line = lineFor(bank, top.id, { ...values, orders: String(top.orders) });
      if (line) tips[categoryId] = { productId: top.id, line, kind: 'best-seller' };
    }
  }
  for (const product of products) {
    const categoryId = product.categoryId?.toString();
    if (!product.isHouseSpecial || !categoryId || tips[categoryId] || !categoryName.has(categoryId)) continue;
    const id = product._id.toString();
    const line = lineFor(MASCOT_COPY.houseSpecialTip, id, { category: categoryName.get(categoryId), dish: product.name, cafe: business.name });
    if (line) tips[categoryId] = { productId: id, line, kind: 'house-special' };
  }
  // Last: the cheapest dish of a category that has enough dishes and one clearly cheapest.
  const byCategory = new Map<string, typeof products>();
  for (const product of products) {
    const categoryId = product.categoryId?.toString();
    if (!categoryId || tips[categoryId] || !categoryName.has(categoryId)) continue;
    byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), product]);
  }
  for (const [categoryId, dishes] of byCategory) {
    if (dishes.length < VALUE_MIN_DISHES) continue;
    const [cheapest, second] = [...dishes].sort((a, b) => a.pricePaise - b.pricePaise);
    if (!(cheapest.pricePaise > 0) || cheapest.pricePaise >= second.pricePaise) continue;
    const id = cheapest._id.toString();
    const line = lineFor(MASCOT_COPY.valueTip, id, {
      category: categoryName.get(categoryId),
      dish: cheapest.name,
      price: formatPrice(cheapest.pricePaise)
    });
    if (line) tips[categoryId] = { productId: id, line, kind: 'value' };
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
