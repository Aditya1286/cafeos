import { apiRequest } from '../../api';
import { GetDashboardAnalyticsResponse } from './types';

export const getDashboard = (): Promise<GetDashboardAnalyticsResponse> => apiRequest('/analytics/dashboard');
