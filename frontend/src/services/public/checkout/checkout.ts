import { apiRequest } from '../../api';
import { CheckoutResponse, StartCheckoutPayload } from './types';

/**
 * `guestToken` is this device's stored guest pass for the café, if any (sent as a header, like the
 * plain order request). With it, or a `deviceProof` in the payload, the paid order earns a pass.
 */
export const start = (
  payload: StartCheckoutPayload,
  { guestToken }: { guestToken?: string | null } = {},
): Promise<CheckoutResponse> =>
  apiRequest('/public/checkout', 'POST', payload, guestToken ? { 'X-Guest-Token': guestToken } : {});

export const getStatus = (sessionId: string): Promise<CheckoutResponse> =>
  apiRequest(`/public/checkout/${sessionId}`);

export const retry = (sessionId: string): Promise<CheckoutResponse> =>
  apiRequest(`/public/checkout/${sessionId}/retry`, 'POST');

export const switchMethod = (
  sessionId: string,
  paymentMethod: 'CASH' | 'ONLINE',
): Promise<CheckoutResponse> =>
  apiRequest(`/public/checkout/${sessionId}/switch`, 'POST', { paymentMethod });
