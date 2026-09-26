import { AdminBusinessSummary } from '../types';

/** The full operating day, midnight to midnight (12 AM → 12 AM next day) — every
 *  hour bucket the backend's peakHeatmap aggregation can return (`$hour` yields 0-23). */
export const HEATMAP_HOURS = Array.from({ length: 24 }, (_, h) => h);

/** `h` is a 24-hour clock hour (0-23). Hour 0 is midnight ("12 AM"), not "0 AM". */
export const formatHeatmapHour = (h: number) =>
  h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;

/** Used by `PlatformInsightsPanel` so the "busiest hour" fact it quotes matches the underlying data. */
export const computeBusiestHour = (
  peakHeatmap: { _id: number; orders: number }[] | undefined,
): { hour: string; orders: number } | null => {
  const byHour = new Map((peakHeatmap || []).map((h) => [h._id, h.orders]));
  const withOrders = HEATMAP_HOURS.map((h) => ({
    hour: formatHeatmapHour(h),
    orders: byHour.get(h) || 0,
  }));
  const busiest = withOrders.reduce(
    (best, cur) => (cur.orders > best.orders ? cur : best),
    withOrders[0],
  );
  return busiest.orders > 0 ? busiest : null;
};

export type BusinessHealth = 'suspended' | 'overdue' | 'healthy';

/** Account health as the ops team triages it: suspended first, then overdue commission, then fine. */
export const businessHealthOf = (b: AdminBusinessSummary): BusinessHealth =>
  b.status === 'SUSPENDED' ? 'suspended' : b.overdueAmountPaise > 0 ? 'overdue' : 'healthy';

/** The single business with the highest lifetime GMV — real data already loaded for the businesses table. */
export const computeTopBusinessByGMV = (
  businesses: AdminBusinessSummary[],
): AdminBusinessSummary | null => {
  if (businesses.length === 0) return null;
  return businesses.reduce(
    (best, cur) => (cur.lifetimeGMVPaise > best.lifetimeGMVPaise ? cur : best),
    businesses[0],
  );
};
