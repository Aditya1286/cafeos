import { apiRequest } from '../../api';
import { ListRefundsResponse, RefundInsightsResponse, RefundListQuery } from './types';

const buildQuery = <T extends object>(params: T): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.toString();
};

export const list = (query: RefundListQuery): Promise<ListRefundsResponse> =>
  apiRequest(`/admin/refunds?${buildQuery(query)}`);

export const insights = (businessId?: string): Promise<RefundInsightsResponse> =>
  apiRequest(`/admin/refunds/insights${businessId ? `?businessId=${businessId}` : ''}`);
