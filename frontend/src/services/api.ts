import { APP_SLUG } from '../constants/app';

const API_BASE_URL = '/api/v1';
const AUTH_TOKEN_KEY = `${APP_SLUG}_token`;

export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const removeAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const apiRequest = async (
  endpoint: string,
  method: string = 'GET',
  body?: any,
  customHeaders: Record<string, string> = {}
) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    // Most endpoints return {error: {message}}, but a few (e.g. otp.controller) return a
    // flat {message} — fall back to that so callers still see the real reason (e.g. a
    // rate-limit message) instead of the generic default.
    throw new Error(data.error?.message || data.message || 'An error occurred during request execution.');
  }

  return data;
};
