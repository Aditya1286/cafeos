import { Order, RefundInsights } from '../../../types';
import { ApiListResponse, ApiMessageResponse, ApiResponse } from '../../apiTypes';

export interface OrderListQuery {
  page: number;
  limit: number;
  q?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
}

export interface RefundListQuery {
  page: number;
  limit: number;
  q?: string;
  paymentStatus?: string;
}

export type ListOrdersResponse = ApiListResponse<Order>;
export type GetOrderResponse = ApiResponse<Order>;
export type GetOrderBillResponse = ApiResponse<any>;
export type UpdateOrderStatusResponse = ApiMessageResponse;
export type ConfirmPaymentResponse = ApiMessageResponse;

export interface BulkUpdateStatusResponse {
  success: boolean;
  data: {
    updated: Order[];
    failed: { orderId: string; message: string }[];
  };
}

export type RefundInsightsResponse = ApiResponse<RefundInsights>;
