import { apiRequest } from '../api';
import { AuthResponse, MeResponse, PasswordResetResponse, RegisterFormData } from './types';

export const getMe = (): Promise<MeResponse> => apiRequest('/auth/me');

export const login = (email: string, password: string): Promise<AuthResponse> =>
  apiRequest('/auth/login', 'POST', { email, password });

/** Same password as email login — owners use their business number, staff the one their owner saved. */
export const loginWithPhone = (phone: string, password: string): Promise<AuthResponse> =>
  apiRequest('/auth/login', 'POST', { phone, password });

export const register = (formData: RegisterFormData): Promise<AuthResponse> =>
  apiRequest('/auth/register', 'POST', formData);

// Owner "forgot password": the email + business phone pair must match before an OTP is sent to
// that phone (purpose ACCOUNT), and the reset only succeeds while that OTP verification is live.
export const verifyPasswordResetDetails = (
  email: string,
  phone: string,
): Promise<PasswordResetResponse> =>
  apiRequest('/auth/password-reset/verify-details', 'POST', { email, phone });

export const resetPassword = (
  email: string,
  phone: string,
  newPassword: string,
): Promise<PasswordResetResponse> =>
  apiRequest('/auth/password-reset', 'POST', { email, phone, newPassword });
