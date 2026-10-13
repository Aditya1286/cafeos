import * as dao from '../../../dao/analyticsMoney.dao';
import { MoneyFacts } from '../../../dao/analyticsMoney.dao';
import { bucketKeyOfDay, bucketsFor } from '../ranges';
import { ALL_ORDERS, scopeFor } from '../scope';
import { KpiResult, MetricContext, MetricDefinition, RankedResult, SeriesResult } from '../types';
import { kpiResult, percentOf, readings } from './shared';

// Where money slips away: cancellations, refunds, and orders served but never paid for. These look
// at every order placed (not just revenue), so they take the order slices but not item filters.

const MAX_REASONS = 8;

const factsCurrent = (ctx: MetricContext) => ctx.memo('money:current', async () => dao.moneyFacts(await scopeFor(ctx, 'current', ALL_ORDERS)));
const factsCompare = (ctx: MetricContext) =>
  ctx.compareRange ? ctx.memo('money:compare', async () => dao.moneyFacts(await scopeFor(ctx, 'compare', ALL_ORDERS))) : Promise.resolve(null);

const moneyKpi = (id: string, unit: 'paise' | 'percent', pick: (f: MoneyFacts) => number | null): MetricDefinition => ({
  id,
  appliesSlices: true,
  appliesItemFilters: false,
  async compute(ctx): Promise<KpiResult> {
    const [current, previous] = await Promise.all([factsCurrent(ctx), factsCompare(ctx)]);
    return kpiResult(unit, pick(current), previous ? pick(previous) : null);
  },
});

export const cancelRate = moneyKpi('kpi.cancel_rate', 'percent', (f) => percentOf(f.cancelled, f.orders));
export const refunds = moneyKpi('kpi.refunds', 'paise', (f) => f.refundedPaise);
export const refundPending = moneyKpi('kpi.refund_pending', 'paise', (f) => f.refundPendingPaise);
export const unpaidServed = moneyKpi('kpi.unpaid_served', 'paise', (f) => f.unpaidServedPaise);
export const gstCollected = moneyKpi('kpi.gst_collected', 'paise', (f) => f.gstPaise);

export const cancellationsOverTime: MetricDefinition = {
  id: 'ts.cancellations',
  appliesSlices: true,
  appliesItemFilters: false,
  async compute(ctx): Promise<SeriesResult> {
    const rows = await ctx.memo('money:buckets', async () => dao.statusByBucket(await scopeFor(ctx, 'current', ALL_ORDERS), ctx.granularity === 'hour' ? 'hour' : 'day'));
    const buckets = bucketsFor(ctx.range, ctx.timezone, ctx.granularity);
    // Days roll up into weeks and months by their bucket key.
    const totals = new Map<string, { orders: number; cancelled: number }>();
    for (const row of rows) {
      const key = ctx.granularity === 'hour' ? row.key : bucketKeyOfDay(row.key, ctx.granularity);
      const acc = totals.get(key) ?? { orders: 0, cancelled: 0 };
      acc.orders += row.orders;
      acc.cancelled += row.cancelled;
      totals.set(key, acc);
    }
    return {
      kind: 'series',
      buckets: buckets.map(({ key, label }) => ({ key, label })),
      series: [
        { id: 'orders', label: 'Orders placed', unit: 'count', points: readings(buckets, (key) => totals.get(key)?.orders ?? 0, ctx.now) },
        { id: 'cancelled', label: 'Cancelled', unit: 'count', points: readings(buckets, (key) => totals.get(key)?.cancelled ?? 0, ctx.now) },
      ],
    };
  },
};

export const cancelReasons: MetricDefinition = {
  id: 'ranked.cancel_reasons',
  appliesSlices: true,
  appliesItemFilters: false,
  async compute(ctx): Promise<RankedResult> {
    const rows = await dao.cancelReasons(await scopeFor(ctx, 'current', ALL_ORDERS), MAX_REASONS);
    return {
      kind: 'ranked',
      columns: [
        { id: 'orders', label: 'Orders', unit: 'count' },
        { id: 'lost', label: 'Value', unit: 'paise' },
      ],
      rows: rows.slice(0, MAX_REASONS).map((r, i) => ({
        id: `reason-${i + 1}`,
        // Written by customers and staff: shown as text, trimmed, with a capital to start.
        label: r.reason ? `${r.reason.charAt(0).toUpperCase()}${r.reason.slice(1)}`.slice(0, 80) : 'No reason given',
        values: { orders: r.orders, lost: r.paise },
      })),
      truncated: rows.length > MAX_REASONS,
    };
  },
};

export const moneyMetrics: MetricDefinition[] = [cancelRate, refunds, refundPending, unpaidServed, gstCollected, cancellationsOverTime, cancelReasons];
