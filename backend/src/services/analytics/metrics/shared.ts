import { Totals } from '../../../dao/analytics.dao';
import { bucketKeyOfDay } from '../ranges';
import { Bucket, Granularity, KpiResult, Unit } from '../types';

export const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Percent change from `previous` to `value`; null when either is missing or there is nothing to compare with. */
export const changePct = (value: number | null, previous: number | null): number | null =>
  value === null || previous === null || previous === 0 ? null : round1(((value - previous) / previous) * 100);

/** `part` as a percent of `whole`, one decimal; null when there is no whole. */
export const percentOf = (part: number, whole: number): number | null => (whole > 0 ? round1((part / whole) * 100) : null);

/** A KPI, with its change against the comparison period and (when there are enough points) a sparkline. */
export const kpiResult = (unit: Unit, value: number | null, previous: number | null, sparkline?: number[]): KpiResult => ({
  kind: 'kpi',
  unit,
  value,
  previous,
  changePct: changePct(value, previous),
  ...(sparkline && sparkline.length > 1 ? { sparkline } : {}),
});

/** Folds hour- or day-keyed totals into the chosen bucket size (hours are already keyed as buckets). */
export const rollupTotals = (rows: (Totals & { key: string })[], granularity: Granularity): Map<string, Totals> => {
  const out = new Map<string, Totals>();
  for (const row of rows) {
    const key = granularity === 'hour' ? row.key : bucketKeyOfDay(row.key, granularity);
    const acc = out.get(key) ?? { sales: 0, orders: 0, qty: 0 };
    acc.sales += row.sales;
    acc.orders += row.orders;
    acc.qty += row.qty;
    out.set(key, acc);
  }
  return out;
};

/** One reading per bucket; a bucket that has not started yet is null, not a misleading zero. */
export const readings = (buckets: Bucket[], pick: (key: string) => number, now: Date): (number | null)[] =>
  buckets.map((b) => (b.start.getTime() > now.getTime() ? null : pick(b.key)));
