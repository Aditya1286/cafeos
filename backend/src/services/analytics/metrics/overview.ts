import * as dao from '../../../dao/analytics.dao';
import { Totals } from '../../../dao/analytics.dao';
import { bucketsFor } from '../ranges';
import { REVENUE, scopeFor } from '../scope';
import { MetricContext, MetricDefinition, Unit } from '../types';
import { kpiResult, readings, rollupTotals, round1 } from './shared';

// Revenue totals for the current period, the comparison period and per bucket (for sparklines and
// the trend chart). Memoised per request, so every Overview metric shares one query of each kind.
export const currentTotals = (ctx: MetricContext) =>
  ctx.memo('totals:current', async () => dao.orderTotals(await scopeFor(ctx, 'current', REVENUE)));

export const compareTotals = (ctx: MetricContext) =>
  ctx.compareRange ? ctx.memo('totals:compare', async () => dao.orderTotals(await scopeFor(ctx, 'compare', REVENUE))) : Promise.resolve(null);

export const currentBuckets = (ctx: MetricContext) =>
  ctx.memo('buckets:current', async () =>
    rollupTotals(await dao.orderTotalsByBucket(await scopeFor(ctx, 'current', REVENUE), ctx.granularity === 'hour' ? 'hour' : 'day'), ctx.granularity),
  );

export const compareBuckets = (ctx: MetricContext) =>
  ctx.compareRange
    ? ctx.memo('buckets:compare', async () =>
        rollupTotals(await dao.orderTotalsByBucket(await scopeFor(ctx, 'compare', REVENUE), ctx.granularity === 'hour' ? 'hour' : 'day'), ctx.granularity),
      )
    : Promise.resolve(null);

const totalsKpi = (id: string, unit: Unit, pick: (t: Totals) => number | null): MetricDefinition => ({
  id,
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx) {
    const [current, previous, byBucket] = await Promise.all([currentTotals(ctx), compareTotals(ctx), currentBuckets(ctx)]);
    const buckets = bucketsFor(ctx.range, ctx.timezone, ctx.granularity);
    const sparkline = readings(
      buckets,
      (key) => {
        const t = byBucket.get(key);
        return t ? (pick(t) ?? 0) : 0;
      },
      ctx.now,
    ).filter((v): v is number => v !== null);
    return kpiResult(unit, pick(current), previous ? pick(previous) : null, sparkline);
  },
});

export const netSales = totalsKpi('kpi.net_sales', 'paise', (t) => t.sales);
export const orderCount = totalsKpi('kpi.orders', 'count', (t) => t.orders);
export const avgTicket = totalsKpi('kpi.avg_ticket', 'paise', (t) => (t.orders > 0 ? Math.round(t.sales / t.orders) : null));
export const itemsPerOrder = totalsKpi('kpi.items_per_order', 'count', (t) => (t.orders > 0 ? round1(t.qty / t.orders) : null));

export const overviewMetrics: MetricDefinition[] = [netSales, orderCount, avgTicket, itemsPerOrder];
