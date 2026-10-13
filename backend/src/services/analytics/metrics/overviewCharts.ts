import * as dao from '../../../dao/analyticsOverview.dao';
import { DAYPART_HOURS, DAYPART_LABELS } from '../dayparts';
import { bucketsFor, hourLabel } from '../ranges';
import { REVENUE, scopeFor } from '../scope';
import { BreakdownResult, DAYPARTS, MatrixResult, MetricDefinition, RankedResult, SeriesResult, Unit } from '../types';
import { compareBuckets, currentBuckets } from './overview';
import { readings, round1 } from './shared';

// ── Sales and orders over time ───────────────────────────────────────────────────────────────────
export const salesOrdersTrend: MetricDefinition = {
  id: 'ts.sales_orders',
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<SeriesResult> {
    const [current, previous] = await Promise.all([currentBuckets(ctx), compareBuckets(ctx)]);
    const buckets = bucketsFor(ctx.range, ctx.timezone, ctx.granularity);
    // The comparison period is laid over the current one bucket by bucket (first with first).
    const previousKeys = previous && ctx.compareRange ? bucketsFor(ctx.compareRange, ctx.timezone, ctx.granularity).map((b) => b.key) : null;
    const line = (id: string, label: string, unit: Unit, pick: (key: string, from: typeof current) => number): SeriesResult['series'][number] => ({
      id,
      label,
      unit,
      points: readings(buckets, (key) => pick(key, current), ctx.now),
      ...(previous && previousKeys ? { previousPoints: buckets.map((_, i) => (previousKeys[i] === undefined ? null : pick(previousKeys[i], previous))) } : {}),
    });
    return {
      kind: 'series',
      buckets: buckets.map(({ key, label }) => ({ key, label })),
      series: [
        line('sales', 'Net sales', 'paise', (key, from) => from.get(key)?.sales ?? 0),
        line('orders', 'Orders', 'count', (key, from) => from.get(key)?.orders ?? 0),
      ],
    };
  },
};

// ── Where sales come from ────────────────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, string> = { QR_TABLE: 'QR table', TAKEAWAY: 'Counter / takeaway', STAFF: 'Staff entered', ADMIN: 'Admin' };
const PAYMENT_LABELS: Record<string, string> = { ONLINE: 'UPI (direct)', CASH: 'Cash', CARD: 'Card', CHECKOUT: 'Online checkout' };

const mix = (id: string, field: 'source' | 'paymentMethod', labels: Record<string, string>): MetricDefinition => ({
  id,
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<BreakdownResult> {
    const rows = await ctx.memo(`by:${field}`, async () => dao.totalsByField(await scopeFor(ctx, 'current', REVENUE), field));
    const total = rows.reduce((sum, r) => sum + r.sales, 0);
    return {
      kind: 'breakdown',
      unit: 'paise',
      slices: rows
        .filter((r) => r.sales > 0)
        .map((r) => ({ id: r.key, label: labels[r.key] ?? 'Other', value: r.sales, share: round1((r.sales / total) * 100) }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)),
    };
  },
});

export const sourceMix = mix('breakdown.source', 'source', SOURCE_LABELS);
export const paymentMix = mix('breakdown.payment', 'paymentMethod', PAYMENT_LABELS);

// ── Average ticket by daypart ────────────────────────────────────────────────────────────────────
export const avgTicketByDaypart: MetricDefinition = {
  id: 'ranked.avg_ticket_by_daypart',
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<RankedResult> {
    const byHour = await ctx.memo('by:hour', async () => dao.totalsByHour(await scopeFor(ctx, 'current', REVENUE)));
    return {
      kind: 'ranked',
      columns: [
        { id: 'avg_ticket', label: 'Average ticket', unit: 'paise' },
        { id: 'orders', label: 'Orders', unit: 'count' },
      ],
      // Always all four dayparts, in day order, so the bars keep their place from one period to the next.
      rows: DAYPARTS.map((daypart) => {
        const hours = new Set(DAYPART_HOURS[daypart]);
        const inPart = byHour.filter((r) => hours.has(r.hour));
        const sales = inPart.reduce((sum, r) => sum + r.sales, 0);
        const orders = inPart.reduce((sum, r) => sum + r.orders, 0);
        return { id: daypart, label: DAYPART_LABELS[daypart], values: { avg_ticket: orders > 0 ? Math.round(sales / orders) : null, orders } };
      }),
      truncated: false,
    };
  },
};

// ── Busy hours ───────────────────────────────────────────────────────────────────────────────────
const WEEKDAYS_MONDAY_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const busyHours: MetricDefinition = {
  id: 'matrix.busy_hours',
  appliesSlices: true,
  appliesItemFilters: true,
  async compute(ctx): Promise<MatrixResult> {
    const cells = await ctx.memo('heatmap', async () => dao.heatmapCells(await scopeFor(ctx, 'current', REVENUE)));
    const grid = () => WEEKDAYS_MONDAY_FIRST.map(() => Array.from({ length: 24 }, () => 0));
    const orders = grid();
    const sales = grid();
    for (const c of cells) {
      const row = (c.dow + 5) % 7; // Mongo counts Sunday as 1; rows here start on Monday
      orders[row][c.hour] = c.orders;
      sales[row][c.hour] = c.sales;
    }
    return { kind: 'matrix', rows: WEEKDAYS_MONDAY_FIRST, cols: Array.from({ length: 24 }, (_, h) => hourLabel(h)), layers: { orders, sales } };
  },
};

export const overviewChartMetrics: MetricDefinition[] = [salesOrdersTrend, sourceMix, paymentMix, avgTicketByDaypart, busyHours];
