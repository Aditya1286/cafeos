import { apiRequest } from '../../api';
import {
  CancelOrderResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  GetOrderResponse,
  MarkPaidResponse,
  RecoverOrdersPayload,
  RecoverOrdersResponse,
  RequestRefundResponse,
} from './types';

/**
 * `guestToken` is this device's stored guest pass for the café, if any. It travels as a header (not
 * in the body), and an order without it is accepted exactly as before.
 */
export const create = (
  payload: CreateOrderPayload,
  { guestToken }: { guestToken?: string | null } = {},
): Promise<CreateOrderResponse> =>
  apiRequest('/public/orders', 'POST', payload, guestToken ? { 'X-Guest-Token': guestToken } : {});

export const get = (orderId: string): Promise<GetOrderResponse> =>
  apiRequest(`/public/orders/${orderId}`);

export const requestRefund = (orderId: string, reason: string): Promise<RequestRefundResponse> =>
  apiRequest(`/public/orders/${orderId}/request-refund`, 'PUT', { reason });

export const markPaid = (orderId: string): Promise<MarkPaidResponse> =>
  apiRequest(`/public/orders/${orderId}/mark-paid`, 'PUT');

export const cancel = (orderId: string): Promise<CancelOrderResponse> =>
  apiRequest(`/public/orders/${orderId}/cancel`, 'PUT');

/** "Find my order": the phone must have just passed a fresh OTP with purpose 'RECOVERY'. */
export const recover = (payload: RecoverOrdersPayload): Promise<RecoverOrdersResponse> =>
  apiRequest('/public/orders/recover', 'POST', payload);
