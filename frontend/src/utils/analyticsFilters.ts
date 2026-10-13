import { APP_SLUG } from '@/constants/app';
import type {
  AnalyticsCompare,
  AnalyticsDaypart,
  AnalyticsGranularity,
  AnalyticsPaymentMethod,
  AnalyticsRange,
  AnalyticsRangePreset,
  AnalyticsRequestFilters,
  AnalyticsSource,
} from '@/services/dashboard/analytics/types';

// The analytics filter bar's state: what the owner picked, remembered per café, and the part of it a
// given view actually sends.

export interface FilterState {
  range: AnalyticsRange;
  compare: AnalyticsCompare;
  granularity: AnalyticsGranularity;
  source: AnalyticsSource[];
  paymentMethod: AnalyticsPaymentMethod[];
  daypart: AnalyticsDaypart[];
  categoryIds: string[];
  veg: 'veg' | 'nonveg' | null;
}

/** Which filters a view can honour. A control a view does not support is disabled, never silently ignored. */
export interface ViewSupport {
  slices: boolean;
  itemFilters: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  range: { preset: 'last7' },
  compare: 'previous_period',
  granularity: 'auto',
  source: [],
  paymentMethod: [],
  daypart: [],
  categoryIds: [],
  veg: null,
};

export const MAX_RANGE_DAYS = 366;

export const RANGE_PRESETS: { id: AnalyticsRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
];
export const COMPARE_OPTIONS: { id: AnalyticsCompare; label: string }[] = [
  { id: 'previous_period', label: 'Previous period' },
  { id: 'same_period_last_week', label: 'Same period last week' },
  { id: 'same_period_last_year', label: 'Same period last year' },
  { id: 'none', label: 'No comparison' },
];
export const GRANULARITY_OPTIONS: { id: AnalyticsGranularity; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'hour', label: 'Hourly' },
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
];
export const SOURCE_OPTIONS: { id: AnalyticsSource; label: string }[] = [
  { id: 'QR_TABLE', label: 'QR table' },
  { id: 'TAKEAWAY', label: 'Counter / takeaway' },
  { id: 'STAFF', label: 'Staff entered' },
  { id: 'ADMIN', label: 'Admin' },
];
export const PAYMENT_OPTIONS: { id: AnalyticsPaymentMethod; label: string }[] = [
  { id: 'ONLINE', label: 'UPI (direct)' },
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
  { id: 'CHECKOUT', label: 'Online checkout' },
];
export const DAYPART_OPTIONS: { id: AnalyticsDaypart; label: string }[] = [
  { id: 'morning', label: 'Morning (5–11)' },
  { id: 'afternoon', label: 'Afternoon (11–4)' },
  { id: 'evening', label: 'Evening (4–9)' },
  { id: 'night', label: 'Night (9–5)' },
];

// ── Dates ────────────────────────────────────────────────────────────────────────────────────────
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateKey = (key: unknown): key is string => {
  if (typeof key !== 'string' || !DATE_KEY.test(key)) return false;
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const dayNumber = (key: string): number => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Why a custom range cannot be used, or null when it is fine. */
export const validateCustomRange = (from: string, to: string): string | null => {
  if (!isValidDateKey(from) || !isValidDateKey(to)) return 'Pick both dates.';
  if (from > to) return 'The start date is after the end date.';
  if (dayNumber(to) - dayNumber(from) + 1 > MAX_RANGE_DAYS)
    return `Pick at most ${MAX_RANGE_DAYS} days.`;
  return null;
};

/** Today's date in the browser's timezone, 'YYYY-MM-DD'. */
export const todayKey = (now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Whether the range still includes today, i.e. whether its numbers keep changing as orders arrive. */
export const rangeIncludesToday = (range: AnalyticsRange, today: string = todayKey()): boolean => {
  if ('from' in range) return range.to >= today;
  return range.preset !== 'yesterday' && range.preset !== 'lastMonth';
};

export const describeRange = (range: AnalyticsRange): string => {
  if ('from' in range) return range.from === range.to ? range.from : `${range.from} to ${range.to}`;
  return RANGE_PRESETS.find((p) => p.id === range.preset)?.label ?? 'Last 7 days';
};

// ── What a view sends ────────────────────────────────────────────────────────────────────────────
/** The filters a view asks for: slices and item filters only when the view supports them. */
export const toRequestFilters = (
  filters: FilterState,
  support: ViewSupport,
): AnalyticsRequestFilters => ({
  range: filters.range,
  compare: filters.compare,
  granularity: filters.granularity,
  ...(support.slices
    ? { source: filters.source, paymentMethod: filters.paymentMethod, daypart: filters.daypart }
    : {}),
  ...(support.itemFilters ? { categoryIds: filters.categoryIds, veg: filters.veg } : {}),
});

/** How many slice / item filters are set and in force for this view (for the "Filters (2)" badge). */
export const activeFilterCount = (filters: FilterState, support: ViewSupport): number =>
  (support.slices
    ? (filters.source.length > 0 ? 1 : 0) +
      (filters.paymentMethod.length > 0 ? 1 : 0) +
      (filters.daypart.length > 0 ? 1 : 0)
    : 0) +
  (support.itemFilters ? (filters.categoryIds.length > 0 ? 1 : 0) + (filters.veg ? 1 : 0) : 0);

// ── Remembering them ─────────────────────────────────────────────────────────────────────────────
type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const storageKey = (businessId: string) => `${APP_SLUG}_analytics_filters_${businessId}`;

const oneOf = <T extends string>(value: unknown, allowed: readonly { id: T }[], fallback: T): T =>
  allowed.some((o) => o.id === value) ? (value as T) : fallback;

const listOf = <T extends string>(value: unknown, allowed: readonly { id: T }[]): T[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((v): v is T => allowed.some((o) => o.id === v)))]
    : [];

/** Reads saved filters, keeping every field that is still valid and defaulting the rest (never throws). */
export const parseStoredFilters = (raw: string | null): FilterState => {
  try {
    const parsed: any = JSON.parse(raw ?? 'null');
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_FILTERS };
    const range = parsed.range;
    let validRange: AnalyticsRange = DEFAULT_FILTERS.range;
    if (range && typeof range === 'object') {
      if (typeof range.preset === 'string' && RANGE_PRESETS.some((p) => p.id === range.preset))
        validRange = { preset: range.preset };
      else if (
        isValidDateKey(range.from) &&
        isValidDateKey(range.to) &&
        validateCustomRange(range.from, range.to) === null
      )
        validRange = { from: range.from, to: range.to };
    }
    return {
      range: validRange,
      compare: oneOf(parsed.compare, COMPARE_OPTIONS, DEFAULT_FILTERS.compare),
      granularity: oneOf(parsed.granularity, GRANULARITY_OPTIONS, DEFAULT_FILTERS.granularity),
      source: listOf(parsed.source, SOURCE_OPTIONS),
      paymentMethod: listOf(parsed.paymentMethod, PAYMENT_OPTIONS),
      daypart: listOf(parsed.daypart, DAYPART_OPTIONS),
      categoryIds: Array.isArray(parsed.categoryIds)
        ? parsed.categoryIds
            .filter(
              (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id),
            )
            .slice(0, 50)
        : [],
      veg: parsed.veg === 'veg' || parsed.veg === 'nonveg' ? parsed.veg : null,
    };
  } catch {
    return { ...DEFAULT_FILTERS };
  }
};

export const loadFilters = (
  businessId: string,
  store: KeyValueStore | null = browserStorage(),
): FilterState => {
  try {
    return parseStoredFilters(store?.getItem(storageKey(businessId)) ?? null);
  } catch {
    return { ...DEFAULT_FILTERS };
  }
};

export const saveFilters = (
  businessId: string,
  filters: FilterState,
  store: KeyValueStore | null = browserStorage(),
): void => {
  try {
    store?.setItem(storageKey(businessId), JSON.stringify(filters));
  } catch {
    /* storage unavailable: the filters just are not remembered */
  }
};

// ── The last view opened ─────────────────────────────────────────────────────────────────────────
const viewKey = (businessId: string) => `${APP_SLUG}_analytics_view_${businessId}`;

/** The view the owner last had open, if it is still one of `validIds` (never throws). */
export const loadViewId = (
  businessId: string,
  validIds: readonly string[],
  store: KeyValueStore | null = browserStorage(),
): string | null => {
  try {
    const saved = store?.getItem(viewKey(businessId)) ?? null;
    return saved && validIds.includes(saved) ? saved : null;
  } catch {
    return null;
  }
};

export const saveViewId = (
  businessId: string,
  viewId: string,
  store: KeyValueStore | null = browserStorage(),
): void => {
  try {
    store?.setItem(viewKey(businessId), viewId);
  } catch {
    /* not remembered this time */
  }
};
