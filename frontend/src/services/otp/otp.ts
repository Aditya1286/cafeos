import { apiRequest } from '../api';
import { OtpActionResponse, OtpStatusResponse } from './types';

// Cheap, no external call — tells the caller whether this phone already has a live
// order-verification window, and which mode (mock/live) the backend is running in.
export const getStatus = (phone: string): Promise<OtpStatusResponse> =>
  apiRequest(`/public/otp/status?phone=${encodeURIComponent(phone)}`, 'GET');

// Mock-mode only — disabled (MOCK_DISABLED) whenever the backend is running live.
export const request = (phone: string): Promise<OtpActionResponse> =>
  apiRequest('/public/otp/request', 'POST', { phone });

// Mock-mode only — verifies a code from request() above.
export const verify = (phone: string, otp: string): Promise<OtpActionResponse> =>
  apiRequest('/public/otp/verify', 'POST', { phone, otp });

// Live-mode — validates the access token the MSG91 widget handed the frontend after a
// successful client-side verify.
export const confirmToken = (phone: string, accessToken: string): Promise<OtpActionResponse> =>
  apiRequest('/public/otp/confirm-token', 'POST', { phone, accessToken });
