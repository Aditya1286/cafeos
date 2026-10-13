import { DashboardAnalytics } from '../../../types';
import { ApiResponse } from '../../apiTypes';

export type GetDashboardAnalyticsResponse = ApiResponse<DashboardAnalytics>;

// ── The batched query: POST /analytics/query ─────────────────────────────────────────────────────
// Mirrors backend/src/services/analytics/types.ts. One request returns every metric a view needs.

export type AnalyticsRangePreset =
  'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth';
/** A preset, or custom business-local dates ('YYYY-MM-DD', both inclusive). */
export type AnalyticsRange = { preset: AnalyticsRangePreset } | { from: string; to: string };
export type AnalyticsCompare =
  'none' | 'previous_period' | 'same_period_last_week' | 'same_period_last_year';
export type AnalyticsGranularity = 'auto' | 'hour' | 'day' | 'week' | 'month';
export type AnalyticsSource = 'QR_TABLE' | 'TAKEAWAY' | 'STAFF' | 'ADMIN';
export type AnalyticsPaymentMethod = 'ONLINE' | 'CASH' | 'CARD' | 'CHECKOUT';
export type AnalyticsDaypart = 'morning' | 'afternoon' | 'evening' | 'night';

export interface AnalyticsRequestFilters {
  range: AnalyticsRange;
  compare: AnalyticsCompare;
  granularity: AnalyticsGranularity;
  source?: AnalyticsSource[];
  paymentMethod?: AnalyticsPaymentMethod[];
  daypart?: AnalyticsDaypart[];
  categoryIds?: string[];
  veg?: 'veg' | 'nonveg' | null;
}

export interface AnalyticsQueryRequest {
  metrics: string[];
  filters: AnalyticsRequestFilters;
}

export type MetricUnit = 'paise' | 'count' | 'percent' | 'seconds';

interface ResultMeta {
  /** Filters this metric ignored (so its card can say so). */
  notApplied?: string[];
  /** True when computed from a capped sample of orders. */
  sampled?: boolean;
}

export interface KpiResult extends ResultMeta {
  kind: 'kpi';
  unit: MetricUnit;
  value: number | null;
  previous: number | null;
  changePct: number | null;
  sparkline?: number[];
}

export interface SeriesLine {
  id: string;
  label: string;
  unit: MetricUnit;
  /** null = no reading (a bucket that has not happened yet, or nothing to take a median of). */
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
  unit: MetricUnit;
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
  unit: MetricUnit;
  slices: BreakdownSlice[];
}

export interface MatrixResult extends ResultMeta {
  kind: 'matrix';
  rows: string[];
  cols: string[];
  layers: Record<string, number[][]>;
}

export type MetricResult = KpiResult | SeriesResult | RankedResult | BreakdownResult | MatrixResult;

export type MetricOutcome =
  { ok: true; data: MetricResult } | { ok: false; error: { code: string; message: string } };

export interface AnalyticsQueryResponse {
  success: boolean;
  meta: {
    timezone: string;
    range: { start: string; end: string };
    compareRange: { start: string; end: string } | null;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  results: Record<string, MetricOutcome>;
}
