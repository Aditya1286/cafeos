import { apiRequest } from '../../api';
import { CancelOrderResponse, CreateOrderPayload, CreateOrderResponse, GetOrderResponse, MarkPaidResponse, RequestRefundResponse } from './types';

export const create = (payload: CreateOrderPayload): Promise<CreateOrderResponse> =>
  apiRequest('/public/orders', 'POST', payload);

export const get = (orderId: string): Promise<GetOrderResponse> => apiRequest(`/public/orders/${orderId}`);

export const requestRefund = (orderId: string, reason: string): Promise<RequestRefundResponse> =>
  apiRequest(`/public/orders/${orderId}/request-refund`, 'PUT', { reason });

export const markPaid = (orderId: string): Promise<MarkPaidResponse> =>
  apiRequest(`/public/orders/${orderId}/mark-paid`, 'PUT');

export const cancel = (orderId: string): Promise<CancelOrderResponse> =>
  apiRequest(`/public/orders/${orderId}/cancel`, 'PUT');
