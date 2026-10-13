import mongoose from 'mongoose';
import { Business } from '../../models/Business';
import { ServiceError } from '../../utils/serviceError';
import { parseAnalyticsRequest } from './filters';
import './metrics'; // registers the built-in metrics
import { getMetric } from './registry';
import { resolveCompareRange, resolveGranularity, resolveRange } from './ranges';
import { AnalyticsFilters, AnalyticsQueryResponse, MetricContext, MetricDefinition, MetricOutcome, MetricResult } from './types';

const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** The filters this metric was asked to honour but does not, so its card can say so. */
const ignoredFilters = (def: MetricDefinition, f: AnalyticsFilters): string[] => {
  const out: string[] = [];
  if (!def.appliesSlices) {
    if (f.source.length) out.push('source');
    if (f.paymentMethod.length) out.push('paymentMethod');
    if (f.daypart.length) out.push('daypart');
  }
  if (!def.appliesItemFilters) {
    if (f.categoryIds.length) out.push('category');
    if (f.veg) out.push('veg');
  }
  return out;
};

/**
 * Runs the requested metrics for one business and returns them keyed by id. One bad metric (unknown
 * id, a failed query) is reported on its own and never fails the others. Metrics that need the same
 * query share it through `ctx.memo`.
 */
export const runAnalyticsQuery = async (input: {
  businessId: mongoose.Types.ObjectId;
  body: unknown;
  now?: Date;
}): Promise<AnalyticsQueryResponse> => {
  const now = input.now ?? new Date();
  const { metrics, filters } = parseAnalyticsRequest(input.body);

  const business = await Business.findById(input.businessId).select('timezone').lean();
  if (!business) throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
  const timezone = business.timezone || DEFAULT_TIMEZONE;

  const range = resolveRange(filters.range, timezone, now);
  const granularity = resolveGranularity(filters.granularity, range, timezone);
  const compareRange = resolveCompareRange(range, filters.compare, timezone, now);

  const shared = new Map<string, Promise<unknown>>();

  const runOne = async (id: string): Promise<MetricOutcome> => {
    const def = getMetric(id);
    if (!def) return { ok: false, error: { code: 'UNKNOWN_METRIC', message: `Unknown metric "${id}".` } };

    // Queries differ by which filters a metric honours, so the cache key carries that.
    const flavour = `${def.appliesSlices ? 's' : '-'}${def.appliesItemFilters ? 'i' : '-'}`;
    const ctx: MetricContext = {
      businessId: input.businessId,
      timezone,
      range,
      compareRange,
      granularity,
      filters,
      now,
      apply: { slices: def.appliesSlices, itemFilters: def.appliesItemFilters },
      memo: <T>(key: string, fn: () => Promise<T>): Promise<T> => {
        const cacheKey = `${flavour}|${key}`;
        let hit = shared.get(cacheKey) as Promise<T> | undefined;
        if (!hit) {
          hit = fn();
          shared.set(cacheKey, hit);
        }
        return hit;
      },
    };

    try {
      const data: MetricResult = await def.compute(ctx);
      const notApplied = ignoredFilters(def, filters);
      return { ok: true, data: notApplied.length ? { ...data, notApplied } : data };
    } catch (error) {
      console.error(`[analytics] metric ${id} failed:`, error);
      return { ok: false, error: { code: 'METRIC_FAILED', message: 'This metric could not be computed.' } };
    }
  };

  const entries = await Promise.all(metrics.map(async (id) => [id, await runOne(id)] as const));

  return {
    meta: {
      timezone,
      range: { start: range.start.toISOString(), end: range.end.toISOString() },
      compareRange: compareRange ? { start: compareRange.start.toISOString(), end: compareRange.end.toISOString() } : null,
      granularity,
    },
    results: Object.fromEntries(entries),
  };
};
