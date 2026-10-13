import * as kitchenDao from '../../../dao/analyticsKitchen.dao';
import * as menuDao from '../../../dao/analyticsMenu.dao';
import * as overviewDao from '../../../dao/analyticsOverview.dao';
import { bucketKeyOfInstant, bucketsFor, hourLabel, rangeDays } from '../ranges';
import { KITCHEN, scopeFor } from '../scope';
import { KpiResult, MetricContext, MetricDefinition, SeriesResult } from '../types';
import { kpiResult, percentOf, round1 } from './shared';

// How fast the kitchen is, from the timestamps stamped on every status change (Order.timeline).
// Medians and 90th percentiles, never a plain average: one order left open for hours must not
// drag the figure. Orders the kitchen worked on count whether or not they were paid; cancelled ones do not.

const DEFAULT_PREP_MINUTES = 15;

/** Nearest-rank percentile (p in 0–100) of a list; null for an empty list. */
export const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(Math.ceil((p / 100) * sorted.length) - 1, 0)];
};

const median = (values: number[]): number | null => percentile(values, 50);

interface Timing {
  createdAt: Date;
  accept: number | null;
  prep: number | null;
  fulfil: number | null;
  /** null when the order has no prep time to judge. */
  late: boolean | null;
}

const seconds = (from?: Date, to?: Date): number | null => {
  if (!from || !to) return null;
  const s = (new Date(to).getTime() - new Date(from).getTime()) / 1000;
  return s >= 0 ? Math.round(s) : null; // a clock that ran backwards is no reading at all
};

const prepMinutes = (ctx: MetricContext) =>
  ctx.memo('prepMinutes', async () => new Map((await menuDao.listProducts(ctx.businessId)).map((p) => [String(p._id), (p.preparationTimeMinutes as number | undefined) ?? DEFAULT_PREP_MINUTES])));

const timings = async (ctx: MetricContext, which: 'current' | 'compare'): Promise<{ timings: Timing[]; sampled: boolean }> => {
  const [{ rows, sampled }, minutes] = await Promise.all([kitchenDao.kitchenOrders(await scopeFor(ctx, which, KITCHEN)), prepMinutes(ctx)]);
  return {
    sampled,
    timings: rows.map((r) => {
      const t = r.timeline ?? {};
      const startedAt = t.preparingAt ?? t.acceptedAt; // old orders only have acceptedAt
      const prep = seconds(startedAt, t.readyAt);
      // An order is late when it took longer than its slowest item is meant to.
      const target = Math.max(...r.productIds.map((id) => minutes.get(String(id)) ?? DEFAULT_PREP_MINUTES), 0) * 60;
      return {
        createdAt: r.createdAt,
        accept: seconds(t.placedAt, startedAt),
        prep,
        fulfil: seconds(t.placedAt, t.completedAt),
        late: prep === null || target === 0 ? null : prep > target,
      };
    }),
  };
};

const timingsCurrent = (ctx: MetricContext) => ctx.memo('kitchen:current', () => timings(ctx, 'current'));
const timingsCompare = (ctx: MetricContext) => (ctx.compareRange ? ctx.memo('kitchen:compare', () => timings(ctx, 'compare')) : Promise.resolve(null));

const known = (values: (number | null)[]): number[] => values.filter((v): v is number => v !== null);

const kitchenKpi = (id: string, unit: 'seconds' | 'percent', measure: (t: Timing[]) => number | null): MetricDefinition => ({
  id,
  appliesSlices: true,
  appliesItemFilters: false,
  async compute(ctx): Promise<KpiResult> {
    const [current, previous] = await Promise.all([timingsCurrent(ctx), timingsCompare(ctx)]);
    const result = kpiResult(unit, measure(current.timings), previous ? measure(previous.timings) : null);
    return current.sampled ? { ...result, sampled: true } : result;
  },
});

export const prepMedian = kitchenKpi('kpi.prep_median', 'seconds', (t) => median(known(t.map((x) => x.prep))));
export const prepP90 = kitchenKpi('kpi.prep_p90', 'seconds', (t) => percentile(known(t.map((x) => x.prep)), 90));
export const fulfilMedian = kitchenKpi('kpi.fulfil_median', 'seconds', (t) => median(known(t.map((x) => x.fulfil))));
export const lateRate = kitchenKpi('kpi.late_rate', 'percent', (t) => {
  const judged = t.filter((x) => x.late !== null);
  return percentOf(judged.filter((x) => x.late).length, judged.length);
});

// ── Times through the period ─────────────────────────────────────────────────────────────────────
export const kitchenTimes: MetricDefinition = {
  id: 'ts.kitchen_times',
  appliesSlices: true,
  appliesItemFilters: false,
  async compute(ctx): Promise<SeriesResult> {
    const { timings: all, sampled } = await timingsCurrent(ctx);
    const buckets = bucketsFor(ctx.range, ctx.timezone, ctx.granularity);
    const byBucket = new Map<string, Timing[]>();
    for (const t of all) {
      const key = bucketKeyOfInstant(t.createdAt, ctx.timezone, ctx.granularity);
      (byBucket.get(key) ?? byBucket.set(key, []).get(key)!).push(t);
    }
    // A bucket with no readings is null (a gap in the line), not zero minutes.
    const points = (pick: (t: Timing) => number | null) =>
      buckets.map((b) => (b.start.getTime() > ctx.now.getTime() ? null : median(known((byBucket.get(b.key) ?? []).map(pick)))));
    const result: SeriesResult = {
      kind: 'series',
      buckets: buckets.map(({ key, label }) => ({ key, label })),
      series: [
        { id: 'accept', label: 'Accepting', unit: 'seconds', points: points((t) => t.accept) },
        { id: 'prep', label: 'Preparing', unit: 'seconds', points: points((t) => t.prep) },
      ],
    };
    return sampled ? { ...result, sampled: true } : result;
  },
};

// ── Orders per hour of the day ───────────────────────────────────────────────────────────────────
export const throughputByHour: MetricDefinition = {
  id: 'ts.throughput_by_hour',
  appliesSlices: true,
  appliesItemFilters: false,
  async compute(ctx): Promise<SeriesResult> {
    const byHour = await ctx.memo('kitchen:byHour', async () => overviewDao.totalsByHour(await scopeFor(ctx, 'current', KITCHEN)));
    const days = Math.max(rangeDays(ctx.range, ctx.timezone), 1);
    const orders = new Map(byHour.map((r) => [r.hour, r.orders]));
    const hours = Array.from({ length: 24 }, (_, h) => h);
    return {
      kind: 'series',
      buckets: hours.map((h) => ({ key: String(h).padStart(2, '0'), label: hourLabel(h) })),
      // Average orders at that hour on a day in the period, so a 7-day and a 30-day view are comparable.
      series: [{ id: 'orders', label: 'Orders per day', unit: 'count', points: hours.map((h) => round1((orders.get(h) ?? 0) / days)) }],
    };
  },
};

export const kitchenMetrics: MetricDefinition[] = [prepMedian, prepP90, fulfilMedian, lateRate, kitchenTimes, throughputByHour];
