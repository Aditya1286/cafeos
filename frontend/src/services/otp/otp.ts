import { apiRequest } from '../api';
import { OtpActionResponse, OtpPurpose, OtpStatusResponse } from './types';

// `purpose: 'ACCOUNT'` asks for a fresh, single-use verification for a sensitive account action
// (password reset, email change) — the backend never treats that as "already verified".

// Cheap, no external call — tells the caller whether this phone already has a live
// order-verification window, and which mode (mock/live) the backend is running in.
export const getStatus = (
  phone: string,
  purpose: OtpPurpose = 'DEFAULT',
): Promise<OtpStatusResponse> =>
  apiRequest(`/public/otp/status?phone=${encodeURIComponent(phone)}&purpose=${purpose}`, 'GET');

// Mock-mode only — disabled (MOCK_DISABLED) whenever the backend is running live.
export const request = (
  phone: string,
  purpose: OtpPurpose = 'DEFAULT',
): Promise<OtpActionResponse> => apiRequest('/public/otp/request', 'POST', { phone, purpose });

// Mock-mode only — verifies a code from request() above.
export const verify = (
  phone: string,
  otp: string,
  purpose: OtpPurpose = 'DEFAULT',
): Promise<OtpActionResponse> => apiRequest('/public/otp/verify', 'POST', { phone, otp, purpose });

// Live-mode — validates the access token the MSG91 widget handed the frontend after a
// successful client-side verify.
export const confirmToken = (
  phone: string,
  accessToken: string,
  purpose: OtpPurpose = 'DEFAULT',
): Promise<OtpActionResponse> =>
  apiRequest('/public/otp/confirm-token', 'POST', { phone, accessToken, purpose });
