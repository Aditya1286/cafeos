import { apiRequest } from '../../api';
import {
  AnalyticsQueryRequest,
  AnalyticsQueryResponse,
  GetDashboardAnalyticsResponse,
} from './types';

export const getDashboard = (): Promise<GetDashboardAnalyticsResponse> =>
  apiRequest('/analytics/dashboard');

/** The analytics screen's data: every metric a view needs, in one request. */
export const query = (request: AnalyticsQueryRequest): Promise<AnalyticsQueryResponse> =>
  apiRequest('/analytics/query', 'POST', request);
