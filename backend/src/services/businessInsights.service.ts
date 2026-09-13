import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Recipe } from '../models/Recipe';
import { InventoryItem } from '../models/InventoryItem';

/**
 * Shared by the owner-facing analytics endpoint and the super-admin per-business
 * insights endpoint, same as remittance.service.ts is shared between the owner
 * and admin remittance views — one computation, two consumers.
 */

export interface RepeatCustomerStats {
  totalCustomers: number;
  repeatCustomers: number;
  oneTimeCustomers: number;
  repeatCustomerPercentage: number | null;
  totalRevenuePaise: number;
  repeatRevenuePaise: number;
  repeatRevenuePercentage: number | null;
}

export async function computeRepeatCustomerStats(businessId: mongoose.Types.ObjectId | string): Promise<RepeatCustomerStats> {
  const bizId = new mongoose.Types.ObjectId(businessId.toString());
  const [agg] = await Order.aggregate([
    { $match: { businessId: bizId, paymentStatus: 'PAID' } },
    { $group: { _id: '$customerPhone', orderCount: { $sum: 1 }, spentPaise: { $sum: '$totalAmountPaise' } } },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        repeatCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
        totalRevenuePaise: { $sum: '$spentPaise' },
        repeatRevenuePaise: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, '$spentPaise', 0] } }
      }
    }
  ]);

  const totalCustomers = agg?.totalCustomers || 0;
  const repeatCustomers = agg?.repeatCustomers || 0;
  const totalRevenuePaise = agg?.totalRevenuePaise || 0;
  const repeatRevenuePaise = agg?.repeatRevenuePaise || 0;

  return {
    totalCustomers,
    repeatCustomers,
    oneTimeCustomers: totalCustomers - repeatCustomers,
    repeatCustomerPercentage: totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10 : null,
    totalRevenuePaise,
    repeatRevenuePaise,
    repeatRevenuePercentage: totalRevenuePaise > 0 ? Math.round((repeatRevenuePaise / totalRevenuePaise) * 1000) / 10 : null
  };
}

export interface ItemMarginRow {
  productId: string;
  name: string;
  pricePaise: number;
  ingredientCostPaise: number | null;
  marginPaise: number | null;
  marginPercentage: number | null;
  hasRecipe: boolean;
}

/**
 * True gross margin per menu item: selling price minus the actual ingredient cost from its
 * Recipe (BOM) x each InventoryItem's costPerUnitPaise — not a guess, the same cost figures
 * the inventory tab already tracks. A product with no recipe defined yet has no knowable cost,
 * so it's flagged rather than silently treated as 100% margin.
 */
export async function computeItemMargins(businessId: mongoose.Types.ObjectId | string): Promise<{ items: ItemMarginRow[]; productsWithoutRecipeCount: number }> {
  const bizId = new mongoose.Types.ObjectId(businessId.toString());
  const [products, recipes] = await Promise.all([
    Product.find({ businessId: bizId }).select('name pricePaise').lean(),
    Recipe.find({ businessId: bizId }).lean()
  ]);

  const recipeByProduct = new Map(recipes.map((r: any) => [r.productId.toString(), r]));
  const inventoryItemIds = [...new Set(recipes.flatMap((r: any) => r.ingredients.map((i: any) => i.inventoryItemId.toString())))];
  const inventoryItems = inventoryItemIds.length
    ? await InventoryItem.find({ _id: { $in: inventoryItemIds } }).select('costPerUnitPaise').lean()
    : [];
  const costByItem = new Map(inventoryItems.map((i: any) => [i._id.toString(), i.costPerUnitPaise]));

  let productsWithoutRecipeCount = 0;
  const items: ItemMarginRow[] = products.map((p: any) => {
    const recipe: any = recipeByProduct.get(p._id.toString());
    if (!recipe) {
      productsWithoutRecipeCount += 1;
      return {
        productId: p._id.toString(), name: p.name, pricePaise: p.pricePaise,
        ingredientCostPaise: null, marginPaise: null, marginPercentage: null, hasRecipe: false
      };
    }
    const ingredientCostPaise = recipe.ingredients.reduce((sum: number, ing: any) => {
      const unitCost = costByItem.get(ing.inventoryItemId.toString()) || 0;
      return sum + Math.round(ing.quantityRequired * unitCost);
    }, 0);
    const marginPaise = p.pricePaise - ingredientCostPaise;
    const marginPercentage = p.pricePaise > 0 ? Math.round((marginPaise / p.pricePaise) * 1000) / 10 : 0;
    return { productId: p._id.toString(), name: p.name, pricePaise: p.pricePaise, ingredientCostPaise, marginPaise, marginPercentage, hasRecipe: true };
  });

  // Lowest margin first — the items most worth a second look on pricing or portioning.
  items.sort((a, b) => {
    if (a.hasRecipe && b.hasRecipe) return (a.marginPercentage ?? 0) - (b.marginPercentage ?? 0);
    return a.hasRecipe === b.hasRecipe ? 0 : a.hasRecipe ? -1 : 1;
  });

  return { items, productsWithoutRecipeCount };
}

export interface KitchenSpeedStats {
  avgAcceptSeconds: number | null;
  avgPrepSeconds: number | null;
  avgFulfillmentSeconds: number | null;
  sampleSize: number;
  windowDays: number;
}

const KITCHEN_SPEED_WINDOW_DAYS = 30;

/**
 * Real kitchen speed from Order.timeline timestamps that are already stamped on every status
 * transition (see updateOrderStatus) — not a marketing number. Windowed to the last 30 days so
 * it reflects current operations rather than being diluted by all-time history.
 */
export async function computeKitchenSpeed(businessId: mongoose.Types.ObjectId | string): Promise<KitchenSpeedStats> {
  const bizId = new mongoose.Types.ObjectId(businessId.toString());
  const since = new Date(Date.now() - KITCHEN_SPEED_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const orders = await Order.find({
    businessId: bizId,
    createdAt: { $gte: since },
    'timeline.acceptedAt': { $exists: true }
  }).select('timeline').lean();

  let acceptTotalMs = 0, acceptCount = 0;
  let prepTotalMs = 0, prepCount = 0;
  let fulfillTotalMs = 0, fulfillCount = 0;

  for (const o of orders) {
    const t: any = o.timeline || {};
    if (t.placedAt && t.acceptedAt) {
      acceptTotalMs += new Date(t.acceptedAt).getTime() - new Date(t.placedAt).getTime();
      acceptCount += 1;
    }
    if (t.acceptedAt && t.readyAt) {
      prepTotalMs += new Date(t.readyAt).getTime() - new Date(t.acceptedAt).getTime();
      prepCount += 1;
    }
    if (t.placedAt && t.completedAt) {
      fulfillTotalMs += new Date(t.completedAt).getTime() - new Date(t.placedAt).getTime();
      fulfillCount += 1;
    }
  }

  return {
    avgAcceptSeconds: acceptCount > 0 ? Math.round(acceptTotalMs / acceptCount / 1000) : null,
    avgPrepSeconds: prepCount > 0 ? Math.round(prepTotalMs / prepCount / 1000) : null,
    avgFulfillmentSeconds: fulfillCount > 0 ? Math.round(fulfillTotalMs / fulfillCount / 1000) : null,
    sampleSize: orders.length,
    windowDays: KITCHEN_SPEED_WINDOW_DAYS
  };
}
