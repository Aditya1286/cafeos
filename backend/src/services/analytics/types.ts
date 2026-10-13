import mongoose from 'mongoose';

// The vocabulary shared by the request parser, the metric registry and every metric.

export const SOURCES = ['QR_TABLE', 'TAKEAWAY', 'STAFF', 'ADMIN'] as const;
export const PAYMENT_METHODS = ['ONLINE', 'CASH', 'CARD', 'CHECKOUT'] as const;
export const DAYPARTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export const COMPARE_MODES = ['none', 'previous_period', 'same_period_last_week', 'same_period_last_year'] as const;
export const GRANULARITIES = ['hour', 'day', 'week', 'month'] as const;
export const RANGE_PRESETS = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth'] as const;

export type Source = (typeof SOURCES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type Daypart = (typeof DAYPARTS)[number];
export type CompareMode = (typeof COMPARE_MODES)[number];
export type Granularity = (typeof GRANULARITIES)[number];
export type RangePreset = (typeof RANGE_PRESETS)[number];

/** A preset, or custom business-local dates ('YYYY-MM-DD', both inclusive). */
export type RangeInput = { preset: RangePreset } | { from: string; to: string };

export interface AnalyticsFilters {
  range: RangeInput;
  compare: CompareMode;
  granularity: 'auto' | Granularity;
  // Order-level slices. Empty = no restriction.
  source: Source[];
  paymentMethod: PaymentMethod[];
  daypart: Daypart[];
  // Item-level filters: they restrict which line items count.
  categoryIds: string[];
  veg: 'veg' | 'nonveg' | null;
}

/** [start, end) in real time. */
export interface ResolvedRange {
  start: Date;
  end: Date;
}

export interface Bucket {
  key: string;
  label: string;
  start: Date;
}

// ── Result shapes: the only contract between metrics and charts ──────────────────────────────────
export type Unit = 'paise' | 'count' | 'percent' | 'seconds';

interface ResultMeta {
  /** Filters this metric ignores, so the card can say so instead of showing unlabelled numbers. */
  notApplied?: string[];
  /** True when the figure was computed from a capped sample of orders. */
  sampled?: boolean;
}

export interface KpiResult extends ResultMeta {
  kind: 'kpi';
  unit: Unit;
  value: number | null;
  previous: number | null;
  changePct: number | null;
  sparkline?: number[];
}

export interface SeriesLine {
  id: string;
  label: string;
  unit: Unit;
  /** null = no reading (a bucket that has not happened yet, or no data to take a median of). */
  points: (number | null)[];
  previousPoints?: (number | null)[];
}

export interface SeriesResult extends ResultMeta {
  kind: 'series';
  buckets: { key: string; label: string }[];
  series: SeriesLine[];
}

export interface RankedColumn {
  id: string;
  label: string;
  unit: Unit;
}

export interface RankedRow {
  id: string;
  label: string;
  sublabel?: string;
  values: Record<string, number | null>;
  previous?: Record<string, number | null>;
}

export interface RankedResult extends ResultMeta {
  kind: 'ranked';
  columns: RankedColumn[];
  rows: RankedRow[];
  truncated: boolean;
  note?: string;
}

export interface BreakdownSlice {
  id: string;
  label: string;
  value: number;
  /** Percent of the total, one decimal. */
  share: number;
}

export interface BreakdownResult extends ResultMeta {
  kind: 'breakdown';
  unit: Unit;
  slices: BreakdownSlice[];
}

export interface MatrixResult extends ResultMeta {
  kind: 'matrix';
  rows: string[];
  cols: string[];
  /** One grid per named measure, each rows × cols. */
  layers: Record<string, number[][]>;
}

export type MetricResult = KpiResult | SeriesResult | RankedResult | BreakdownResult | MatrixResult;

// ── Metric plumbing ──────────────────────────────────────────────────────────────────────────────
export interface MetricContext {
  businessId: mongoose.Types.ObjectId;
  timezone: string;
  range: ResolvedRange;
  compareRange: ResolvedRange | null;
  granularity: Granularity;
  filters: AnalyticsFilters;
  now: Date;
  /** Which filters this metric honours (set by the runner from the metric's own flags). */
  apply: { slices: boolean; itemFilters: boolean };
  /** Runs `fn` once per request for a key, so metrics that need the same query share its result. */
  memo<T>(key: string, fn: () => Promise<T>): Promise<T>;
}

export interface MetricDefinition {
  /** Stable id, 'kind.name', e.g. 'kpi.net_sales'. */
  id: string;
  appliesSlices: boolean;
  appliesItemFilters: boolean;
  compute(ctx: MetricContext): Promise<MetricResult>;
}

export type MetricOutcome = { ok: true; data: MetricResult } | { ok: false; error: { code: string; message: string } };

export interface AnalyticsQueryResponse {
  meta: {
    timezone: string;
    range: { start: string; end: string };
    compareRange: { start: string; end: string } | null;
    granularity: Granularity;
  };
  results: Record<string, MetricOutcome>;
}
