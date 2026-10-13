import * as dao from '../../../dao/analyticsCustomers.dao';
import { bucketKeyOfDay, bucketKeyOfInstant, bucketsFor } from '../ranges';
import { REVENUE, scopeFor } from '../scope';
import { BreakdownResult, KpiResult, MetricContext, MetricDefinition, RankedResult, SeriesResult } from '../types';
import { kpiResult, percentOf, readings } from './shared';

// Customer metrics take only the date range and comparison: "new" and "lapsed" only mean something
// across every order, so order slices and item filters are not applied (the screen disables them).
// A customer is a phone number as stored, the same identity the older repeat-customer stat used.

const TOP_LIMIT = 25;
const LAPSED_AFTER_DAYS = 30;
const DAY_MS = 86_400_000;

/** 60••••••78: enough to recognise a regular, not enough to call them. */
export const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.length < 5 ? '••••' : `${digits.slice(0, 2)}${'•'.repeat(digits.length - 4)}${digits.slice(-2)}`;
};

const activityCurrent = (ctx: MetricContext) => ctx.memo('customers:current', async () => dao.customerRangeActivity(await scopeFor(ctx, 'current', REVENUE)));
const activityCompare = (ctx: MetricContext) =>
  ctx.compareRange ? ctx.memo('customers:compare', async () => dao.customerRangeActivity(await scopeFor(ctx, 'compare', REVENUE))) : Promise.resolve(null);
const lifetime = (ctx: MetricContext) => ctx.memo('customers:lifetime', async () => dao.customerLifetime(ctx.businessId, ctx.range.end));

export const activeCustomers: MetricDefinition = {
  id: 'kpi.active_customers',
  appliesSlices: false,
  appliesItemFilters: false,
  async compute(ctx): Promise<KpiResult> {
    const [current, previous] = await Promise.all([activityCurrent(ctx), activityCompare(ctx)]);
    return kpiResult('count', current.length, previous ? previous.length : null);
  },
};

export const newVsReturning: MetricDefinition = {
  id: 'ts.new_vs_returning',
  appliesSlices: false,
  appliesItemFilters: false,
  async compute(ctx): Promise<SeriesResult> {
    const [pairs, everyone] = await Promise.all([
      ctx.memo('customers:buckets', async () => dao.customerBucketActivity(await scopeFor(ctx, 'current', REVENUE), ctx.granularity === 'hour' ? 'hour' : 'day')),
      lifetime(ctx),
    ]);
    const buckets = bucketsFor(ctx.range, ctx.timezone, ctx.granularity);
    const firstBucket = new Map(everyone.map((c) => [c.phone, bucketKeyOfInstant(c.first, ctx.timezone, ctx.granularity)]));

    // Who was active in each bucket (days roll up into weeks and months).
    const active = new Map<string, Set<string>>();
    for (const { key, phone } of pairs) {
      const bucketKey = ctx.granularity === 'hour' ? key : bucketKeyOfDay(key, ctx.granularity);
      (active.get(bucketKey) ?? active.set(bucketKey, new Set()).get(bucketKey)!).add(phone);
    }
    // New = their very first order falls in this bucket; returning = they had ordered before it.
    const count = (key: string, wantNew: boolean) => [...(active.get(key) ?? [])].filter((phone) => (firstBucket.get(phone) === key) === wantNew).length;

    return {
      kind: 'series',
      buckets: buckets.map(({ key, label }) => ({ key, label })),
      series: [
        { id: 'new', label: 'New', unit: 'count', points: readings(buckets, (key) => count(key, true), ctx.now) },
        { id: 'returning', label: 'Returning', unit: 'count', points: readings(buckets, (key) => count(key, false), ctx.now) },
      ],
    };
  },
};

const VISIT_BANDS: { id: string; label: string; from: number; to: number }[] = [
  { id: '1', label: '1 visit', from: 1, to: 1 },
  { id: '2', label: '2 visits', from: 2, to: 2 },
  { id: '3-5', label: '3–5 visits', from: 3, to: 5 },
  { id: '6+', label: '6+ visits', from: 6, to: Infinity },
];

export const visitFrequency: MetricDefinition = {
  id: 'breakdown.visit_frequency',
  appliesSlices: false,
  appliesItemFilters: false,
  async compute(ctx): Promise<BreakdownResult> {
    const current = await activityCurrent(ctx);
    return {
      kind: 'breakdown',
      unit: 'count',
      // In order of frequency (not by size), so the picture reads the same from one period to the next.
      slices: VISIT_BANDS.map((band) => ({ band, value: current.filter((c) => c.orders >= band.from && c.orders <= band.to).length }))
        .filter((b) => b.value > 0)
        .map(({ band, value }) => ({ id: band.id, label: band.label, value, share: percentOf(value, current.length) ?? 0 })),
    };
  },
};

export const topCustomers: MetricDefinition = {
  id: 'ranked.top_customers',
  appliesSlices: false,
  appliesItemFilters: false,
  async compute(ctx): Promise<RankedResult> {
    const current = [...(await activityCurrent(ctx))].sort((a, b) => b.spent - a.spent || b.orders - a.orders || a.phone.localeCompare(b.phone));
    return {
      kind: 'ranked',
      columns: [
        { id: 'visits', label: 'Visits', unit: 'count' },
        { id: 'spent', label: 'Spent', unit: 'paise' },
      ],
      // Row ids are positions, never the phone number: the number must not leave the server unmasked.
      rows: current.slice(0, TOP_LIMIT).map((c, i) => ({ id: `customer-${i + 1}`, label: c.name, sublabel: maskPhone(c.phone), values: { visits: c.orders, spent: c.spent } })),
      truncated: current.length > TOP_LIMIT,
    };
  },
};

export const lapsedCustomers: MetricDefinition = {
  id: 'ranked.lapsed_customers',
  appliesSlices: false,
  appliesItemFilters: false,
  async compute(ctx): Promise<RankedResult> {
    const everyone = await lifetime(ctx);
    // "Lapsed" is measured at the end of the period (or now, if it is still running).
    const asOf = Math.min(ctx.range.end.getTime(), ctx.now.getTime());
    const lapsed = everyone
      .filter((c) => c.orders >= 2 && c.last.getTime() < asOf - LAPSED_AFTER_DAYS * DAY_MS)
      .sort((a, b) => b.spent - a.spent || a.phone.localeCompare(b.phone));
    return {
      kind: 'ranked',
      columns: [
        { id: 'visits', label: 'Visits', unit: 'count' },
        { id: 'spent', label: 'Spent', unit: 'paise' },
        { id: 'days', label: 'Days away', unit: 'count' },
      ],
      rows: lapsed.slice(0, TOP_LIMIT).map((c, i) => ({
        id: `customer-${i + 1}`,
        label: c.name,
        sublabel: maskPhone(c.phone),
        values: { visits: c.orders, spent: c.spent, days: Math.floor((asOf - c.last.getTime()) / DAY_MS) },
      })),
      truncated: lapsed.length > TOP_LIMIT,
      note: `${lapsed.length} regulars (2+ visits) have not been back in ${LAPSED_AFTER_DAYS} days.`,
    };
  },
};

export const customerMetrics: MetricDefinition[] = [activeCustomers, newVsReturning, visitFrequency, topCustomers, lapsedCustomers];
