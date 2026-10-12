import { apiRequest } from '../../api';
import {
  BulkUpdateStatusResponse,
  ConfirmPaymentResponse,
  GetOrderBillResponse,
  GetOrderResponse,
  ListActiveOrdersResponse,
  ListOrdersResponse,
  OrderListQuery,
  RefundInsightsResponse,
  RefundListQuery,
  UpdateOrderStatusResponse,
} from './types';

const buildQuery = <T extends object>(params: T): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.toString();
};

export const list = (): Promise<ListOrdersResponse> => apiRequest('/orders');

/** Every order the kitchen is still working on (New, Preparing, Ready), oldest first, not paginated:
 * the kitchen board needs all of them, not the newest 25 of any status that `list` returns. */
export const listActive = (): Promise<ListActiveOrdersResponse> => apiRequest('/orders/active');

export const search = (query: OrderListQuery): Promise<ListOrdersResponse> =>
  apiRequest(`/orders?${buildQuery(query)}`);

export const get = (orderId: string): Promise<GetOrderResponse> => apiRequest(`/orders/${orderId}`);

export const getBill = (orderId: string): Promise<GetOrderBillResponse> =>
  apiRequest(`/orders/${orderId}/bill`);

export const updateStatus = (orderId: string, status: string): Promise<UpdateOrderStatusResponse> =>
  apiRequest(`/orders/${orderId}/status`, 'PUT', { status });

export const confirmPayment = (orderId: string): Promise<ConfirmPaymentResponse> =>
  apiRequest(`/orders/${orderId}/confirm-payment`, 'PUT');

export const bulkUpdateStatus = (
  orderIds: string[],
  status: string,
): Promise<BulkUpdateStatusResponse> =>
  apiRequest('/orders/bulk-status', 'PUT', { orderIds, status });

export const listRefunds = (query: RefundListQuery): Promise<ListOrdersResponse> =>
  apiRequest(`/orders/refunds?${buildQuery(query)}`);

export const refundInsights = (): Promise<RefundInsightsResponse> =>
  apiRequest('/orders/refunds/insights');
