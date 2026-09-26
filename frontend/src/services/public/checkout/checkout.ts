import { apiRequest } from '../../api';
import { CheckoutResponse, StartCheckoutPayload } from './types';

export const start = (payload: StartCheckoutPayload): Promise<CheckoutResponse> =>
  apiRequest('/public/checkout', 'POST', payload);

export const getStatus = (sessionId: string): Promise<CheckoutResponse> =>
  apiRequest(`/public/checkout/${sessionId}`);

export const retry = (sessionId: string): Promise<CheckoutResponse> =>
  apiRequest(`/public/checkout/${sessionId}/retry`, 'POST');

export const switchMethod = (
  sessionId: string,
  paymentMethod: 'CASH' | 'ONLINE',
): Promise<CheckoutResponse> =>
  apiRequest(`/public/checkout/${sessionId}/switch`, 'POST', { paymentMethod });
