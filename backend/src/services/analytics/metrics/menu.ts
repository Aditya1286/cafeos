import * as dao from '../../../dao/analyticsMenu.dao';
import mongoose from 'mongoose';
import { computeItemMargins } from '../../businessInsights.service';
import { REVENUE, scopeFor } from '../scope';
import { BreakdownResult, BreakdownSlice, KpiResult, MetricContext, MetricDefinition, RankedResult, RankedRow } from '../types';
import { changePct, kpiResult, percentOf, round1 } from './shared';

const MAX_ITEM_ROWS = 200;
const MAX_SLOW_MOVERS = 50;
const DAY_MS = 86_400_000;

// Shared lookups, fetched once per request.
const productMap = (ctx: MetricContext) =>
  ctx.memo('products', async () => new Map((await dao.listProducts(ctx.businessId)).map((p) => [String(p._id), p])));

const categoryNames = (ctx: MetricContext) =>
  ctx.memo('categories', async () => new Map((await dao.listCategories(ctx.businessId)).map((c) => [String(c._id), c.name as string])));

/** Ingredient cost per unit sold, by product id; null for a product without a recipe. */
const unitCosts = (ctx: MetricContext) =>
  ctx.memo('unitCosts', async () => {
    const { items } = await computeItemMargins(ctx.businessId);
    return new Map(items.map((i) => [i.productId, i.ingredientCostPaise]));
  });

const itemsCurrent = (ctx: MetricContext) => ctx.memo('items:current', async () => dao.itemSales(await scopeFor(ctx, 'current', REVENUE)));
const itemsCompare = (ctx: MetricContext) =>
  ctx.compareRange ? ctx.memo('items:compare', async () => dao.itemSales(await scopeFor(ctx, 'compare', REVENUE))) : Promise.resolve(null);

// ── The item list, with what each item earned ────────────────────────────────────────────────────
export const itemList: MetricDefinition = {
  id: 'ranked.items',
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<RankedResult> {
    const [current, previous, products, categories, costs] = await Promise.all([itemsCurrent(ctx), itemsCompare(ctx), productMap(ctx), categoryNames(ctx), unitCosts(ctx)]);
    const totalRevenue = current.reduce((sum, r) => sum + r.revenue, 0);
    const before = new Map((previous ?? []).map((r) => [r.productId, r]));

    const rows: RankedRow[] = current.slice(0, MAX_ITEM_ROWS).map((r) => {
      const product = products.get(r.productId);
      const unitCost = costs.get(r.productId) ?? null;
      const prior = before.get(r.productId);
      return {
        id: r.productId,
        label: product?.name ?? r.name,
        ...(product && categories.get(String(product.categoryId)) ? { sublabel: categories.get(String(product.categoryId)) } : {}),
        values: {
          units: r.units,
          revenue: r.revenue,
          share: percentOf(r.revenue, totalRevenue),
          // An estimate: today's recipe cost per unit against what was actually charged.
          margin: unitCost === null ? null : r.revenue - r.units * unitCost,
          trend: previous ? changePct(r.revenue, prior?.revenue ?? null) : null,
        },
        ...(previous ? { previous: { units: prior?.units ?? 0, revenue: prior?.revenue ?? 0 } } : {}),
      };
    });

    const withRecipe = rows.filter((row) => row.values.margin !== null).length;
    return {
      kind: 'ranked',
      columns: [
        { id: 'units', label: 'Sold', unit: 'count' },
        { id: 'revenue', label: 'Sales', unit: 'paise' },
        { id: 'share', label: 'Share', unit: 'percent' },
        { id: 'margin', label: 'Margin', unit: 'paise' },
        { id: 'trend', label: 'Trend', unit: 'percent' },
      ],
      rows,
      truncated: current.length > MAX_ITEM_ROWS,
      note: rows.length ? `Margin is estimated for ${withRecipe} of ${rows.length} items (the ones with a recipe).` : undefined,
    };
  },
};

// ── Mix by category / by veg ─────────────────────────────────────────────────────────────────────
const toSlices = (totals: Map<string, { label: string; value: number }>): BreakdownSlice[] => {
  const total = [...totals.values()].reduce((sum, t) => sum + t.value, 0);
  return [...totals.entries()]
    .filter(([, t]) => t.value > 0)
    .map(([id, t]) => ({ id, label: t.label, value: t.value, share: round1((t.value / total) * 100) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};

const itemMix = (id: string, group: (product: { categoryId?: unknown; isVeg?: boolean } | undefined, categories: Map<string, string>) => { id: string; label: string }): MetricDefinition => ({
  id,
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<BreakdownResult> {
    const [current, products, categories] = await Promise.all([itemsCurrent(ctx), productMap(ctx), categoryNames(ctx)]);
    const totals = new Map<string, { label: string; value: number }>();
    for (const r of current) {
      const g = group(products.get(r.productId), categories);
      const entry = totals.get(g.id) ?? { label: g.label, value: 0 };
      entry.value += r.revenue;
      totals.set(g.id, entry);
    }
    return { kind: 'breakdown', unit: 'paise', slices: toSlices(totals) };
  },
});

export const categoryMix = itemMix('breakdown.category', (product, categories) => {
  const name = product ? categories.get(String(product.categoryId)) : undefined;
  return name ? { id: String(product!.categoryId), label: name } : { id: 'none', label: 'Uncategorised' };
});

export const vegMix = itemMix('breakdown.veg', (product) =>
  !product ? { id: 'other', label: 'Other' } : product.isVeg === false ? { id: 'nonveg', label: 'Non-veg' } : { id: 'veg', label: 'Veg' },
);

// ── Add-on attach rate ───────────────────────────────────────────────────────────────────────────
export const addonAttachRate: MetricDefinition = {
  id: 'kpi.addon_attach_rate',
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<KpiResult> {
    const [current, previous] = await Promise.all([
      ctx.memo('addons:current', async () => dao.addonStats(await scopeFor(ctx, 'current', REVENUE))),
      ctx.compareRange ? ctx.memo('addons:compare', async () => dao.addonStats(await scopeFor(ctx, 'compare', REVENUE))) : Promise.resolve(null),
    ]);
    return kpiResult('percent', percentOf(current.withAddons, current.lines), previous ? percentOf(previous.withAddons, previous.lines) : null);
  },
};

// ── Slow movers ──────────────────────────────────────────────────────────────────────────────────
// Menu items still on offer that did not sell in the period. Order slices (source, payment, daypart)
// are not applied: "did not sell at all" is only meaningful across every kind of order.
export const slowMovers: MetricDefinition = {
  id: 'ranked.slow_movers',
  appliesSlices: false,
  appliesItemFilters: true,
  async compute(ctx): Promise<RankedResult> {
    const [current, products, categories, lastSold, allowed] = await Promise.all([
      itemsCurrent(ctx),
      productMap(ctx),
      categoryNames(ctx),
      ctx.memo('lastSold', async () => dao.lastSoldAtByProduct(ctx.businessId)),
      ctx.memo('allowed', async (): Promise<Set<string> | null> => {
        const scope = await scopeFor(ctx, 'current', REVENUE);
        return scope.productIds ? new Set(scope.productIds.map((id: mongoose.Types.ObjectId) => String(id))) : null;
      }),
    ]);
    const sold = new Set(current.map((r) => r.productId));
    const onOffer = [...products.entries()].filter(([id, p]) => p.isAvailable !== false && !p.isDeleted && (!allowed || allowed.has(id)));
    const unsold = onOffer.filter(([id]) => !sold.has(id));

    const days = (id: string): number | null => {
      const last = lastSold.get(id);
      return last ? Math.max(Math.floor((ctx.now.getTime() - last.getTime()) / DAY_MS), 0) : null;
    };
    const rows: RankedRow[] = unsold
      .map(([id, p]) => ({
        id,
        label: p.name as string,
        ...(categories.get(String(p.categoryId)) ? { sublabel: categories.get(String(p.categoryId)) } : {}),
        values: { days: days(id) },
      }))
      // Never sold first, then the longest gap.
      .sort((a, b) => (b.values.days ?? Infinity) - (a.values.days ?? Infinity) || a.label.localeCompare(b.label));

    return {
      kind: 'ranked',
      columns: [{ id: 'days', label: 'Days since last sale', unit: 'count' }],
      rows: rows.slice(0, MAX_SLOW_MOVERS),
      truncated: rows.length > MAX_SLOW_MOVERS,
      note: `${unsold.length} of ${onOffer.length} items on the menu did not sell in this period.`,
    };
  },
};

export const menuMetrics: MetricDefinition[] = [itemList, categoryMix, vegMix, addonAttachRate, slowMovers];
