import { AdminAnalytics, AdminBusinessInsights, BusinessHourlyHeatmap, SuperAdminOverview, TopBusinessByRevenue } from '../../../types';
import { ApiResponse } from '../../apiTypes';

export type GetAnalyticsResponse = ApiResponse<AdminAnalytics>;
export type GetOverviewResponse = ApiResponse<SuperAdminOverview>;
export type GetTopBusinessesResponse = ApiResponse<{ businesses: TopBusinessByRevenue[] }>;
export type GetBusinessHeatmapResponse = ApiResponse<BusinessHourlyHeatmap>;
export type GetBusinessInsightsResponse = ApiResponse<AdminBusinessInsights>;
