import { apiRequest } from '../../api';
import { GetAnalyticsResponse, GetBusinessHeatmapResponse, GetBusinessInsightsResponse, GetOverviewResponse, GetTopBusinessesResponse } from './types';

export const getAnalytics = (range: string): Promise<GetAnalyticsResponse> => apiRequest(`/admin/analytics?range=${range}`);

export const getOverview = (): Promise<GetOverviewResponse> => apiRequest('/admin/overview');

// Ranked by actual paid-order revenue in the last 90 days — NOT lifetimeGMVPaise.
export const getTopBusinesses = (limit: number): Promise<GetTopBusinessesResponse> =>
  apiRequest(`/admin/analytics/top-businesses?limit=${limit}`);

// Day-of-week x hour-of-day revenue heatmap for a single business (last 90 days).
export const getBusinessHeatmap = (businessId: string): Promise<GetBusinessHeatmapResponse> =>
  apiRequest(`/admin/analytics/business-heatmap?businessId=${businessId}`);

// Repeat-customer rate, item margins, kitchen speed for one business.
export const getBusinessInsights = (businessId: string): Promise<GetBusinessInsightsResponse> =>
  apiRequest(`/admin/analytics/business-insights?businessId=${businessId}`);
