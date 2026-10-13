import { ServiceError } from '../../utils/serviceError';
import { diffDaysKey, isValidDateKey } from './dateKeys';
import {
  AnalyticsFilters,
  COMPARE_MODES,
  CompareMode,
  DAYPARTS,
  Daypart,
  GRANULARITIES,
  Granularity,
  PAYMENT_METHODS,
  PaymentMethod,
  RANGE_PRESETS,
  RangeInput,
  RangePreset,
  SOURCES,
  Source,
} from './types';

export const MAX_METRICS_PER_REQUEST = 16;
export const MAX_RANGE_DAYS = 366;
const MAX_CATEGORY_IDS = 50;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

const invalid = (message: string) => new ServiceError(400, 'INVALID_INPUT', message);
const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A list of values from a fixed set: missing means "none", anything unexpected is refused. */
const enumList = <T extends string>(value: unknown, allowed: readonly T[], field: string): T[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw invalid(`${field} must be a list.`);
  const out: T[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item)) throw invalid(`${field} has a value that is not allowed.`);
    if (!out.includes(item as T)) out.push(item as T);
  }
  return out;
};

const parseRange = (value: unknown): RangeInput => {
  if (value === undefined || value === null) return { preset: 'last7' };
  if (!isPlainObject(value)) throw invalid('range must be an object.');
  if (value.preset !== undefined) {
    if (typeof value.preset !== 'string' || !(RANGE_PRESETS as readonly string[]).includes(value.preset)) throw invalid('Unknown range preset.');
    return { preset: value.preset as RangePreset };
  }
  const { from, to } = value;
  if (typeof from !== 'string' || typeof to !== 'string' || !isValidDateKey(from) || !isValidDateKey(to)) {
    throw invalid('A custom range needs valid from and to dates (YYYY-MM-DD).');
  }
  if (from > to) throw invalid('The range start must not be after its end.');
  if (diffDaysKey(to, from) + 1 > MAX_RANGE_DAYS) throw invalid(`A range can cover at most ${MAX_RANGE_DAYS} days.`);
  return { from, to };
};

/**
 * Validates an analytics query body and fills in defaults (last 7 days, compared with the previous
 * period, automatic granularity, no slices). Anything malformed is a 400 in the standard shape; the
 * returned filters only ever hold values from the fixed sets above, never raw input.
 */
export const parseAnalyticsRequest = (body: unknown): { metrics: string[]; filters: AnalyticsFilters } => {
  if (!isPlainObject(body)) throw invalid('The request body must be a JSON object.');

  const { metrics, filters } = body;
  if (!Array.isArray(metrics) || metrics.length === 0) throw invalid('metrics must be a non-empty list.');
  if (metrics.length > MAX_METRICS_PER_REQUEST) throw invalid(`A request can ask for at most ${MAX_METRICS_PER_REQUEST} metrics.`);
  const ids: string[] = [];
  for (const id of metrics) {
    if (typeof id !== 'string' || id.length === 0 || id.length > 64) throw invalid('Each metric id must be a short string.');
    if (!ids.includes(id)) ids.push(id);
  }

  const f = filters === undefined || filters === null ? {} : filters;
  if (!isPlainObject(f)) throw invalid('filters must be an object.');

  const compare = f.compare === undefined ? 'previous_period' : f.compare;
  if (typeof compare !== 'string' || !(COMPARE_MODES as readonly string[]).includes(compare)) throw invalid('Unknown compare mode.');

  const granularity = f.granularity === undefined ? 'auto' : f.granularity;
  if (granularity !== 'auto' && (typeof granularity !== 'string' || !(GRANULARITIES as readonly string[]).includes(granularity))) {
    throw invalid('Unknown granularity.');
  }

  const categoryIds: string[] = [];
  if (f.categoryIds !== undefined && f.categoryIds !== null) {
    if (!Array.isArray(f.categoryIds) || f.categoryIds.length > MAX_CATEGORY_IDS) throw invalid('categoryIds must be a short list.');
    for (const id of f.categoryIds) {
      if (typeof id !== 'string' || !OBJECT_ID.test(id)) throw invalid('categoryIds has an invalid id.');
      if (!categoryIds.includes(id)) categoryIds.push(id);
    }
  }

  const veg = f.veg === undefined || f.veg === null ? null : f.veg;
  if (veg !== null && veg !== 'veg' && veg !== 'nonveg') throw invalid('veg must be "veg" or "nonveg".');

  return {
    metrics: ids,
    filters: {
      range: parseRange(f.range),
      compare: compare as CompareMode,
      granularity: granularity as 'auto' | Granularity,
      source: enumList<Source>(f.source, SOURCES, 'source'),
      paymentMethod: enumList<PaymentMethod>(f.paymentMethod, PAYMENT_METHODS, 'paymentMethod'),
      daypart: enumList<Daypart>(f.daypart, DAYPARTS, 'daypart'),
      categoryIds,
      veg,
    },
  };
};

/** True when any order-level slice is set. */
export const hasSlices = (f: AnalyticsFilters): boolean => f.source.length > 0 || f.paymentMethod.length > 0 || f.daypart.length > 0;
/** True when any item-level filter is set. */
export const hasItemFilters = (f: AnalyticsFilters): boolean => f.categoryIds.length > 0 || f.veg !== null;
