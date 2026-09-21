import { AdminRefundInsights, Order } from '../../../types';
import { ApiListResponse, ApiResponse } from '../../apiTypes';

export interface RefundListQuery {
  page: number;
  limit: number;
  q?: string;
  businessId?: string;
  paymentStatus?: string;
}

export type ListRefundsResponse = ApiListResponse<Order>;
export type RefundInsightsResponse = ApiResponse<AdminRefundInsights>;
