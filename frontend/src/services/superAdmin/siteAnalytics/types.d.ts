import { ApiResponse } from '../../apiTypes';

export interface SiteTotals {
  pageviews: number;
  visitors: number;
  visits: number;
  /** Visits that saw the quiz's first question / that sent it. */
  demoStarts: number;
  demoSubmitted: number;
  /** Leads created in the period (counted from the leads, not the analytics). */
  demoRequests: number;
  /** demoRequests / visitors, 0..1 */
  conversionRate: number;
}

/** GET /admin/site-analytics — the marketing site's own analytics for the last `days` IST days. */
export interface SiteReport {
  /** `preset` is the date picker's id (today, yesterday, last_7_days, last_30_days). */
  range: { preset: string; days: number; from: string; to: string };
  totals: SiteTotals;
  /** The same stretch of time just before (today so far vs yesterday up to the same hour). */
  previous: SiteTotals;
  daily: Array<{ date: string; pageviews: number; visitors: number; leads: number }>;
  /** day: 1 = Monday … 7 = Sunday; hour 0–23, IST. */
  heatmap: Array<{ day: number; hour: number; count: number }>;
  /** Visits and leads per source (utm_source, else referring host, else Direct), most leads first. */
  sources: Array<{ source: string; visits: number; leads: number }>;
  devices: Array<{ device: 'mobile' | 'tablet' | 'desktop'; visits: number }>;
  pages: Array<{ path: string; pageviews: number; visitors: number }>;
  funnel: Array<{ index: number; step: string; sessions: number }>;
  funnelSubmitted: number;
  answers: Array<{ step: string; value: string; visits: number }>;
}

export type SiteReportResponse = ApiResponse<SiteReport>;
