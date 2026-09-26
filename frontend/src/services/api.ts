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

/**
 * Every failed API call rejects with one of these. `message` is always fit to show a user;
 * `code` is the backend's error code, or one of the transport codes below when the request
 * never got an answer from the backend at all.
 */
export class ApiError extends Error {
  readonly status: number; // 0 when there was no HTTP response at all
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const NETWORK_ERROR = 'NETWORK_ERROR'; // the browser couldn't reach the server (offline, DNS, CORS…)
const SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE'; // something in front of the backend answered instead

// Our backend answers every request with JSON — errors included. A response that isn't JSON came
// from whatever sits in front of it: Vite's dev proxy replies to a stopped backend with an empty
// `500 text/plain`, and nginx/load balancers with an HTML 502/503/504 page. Parsing those as JSON
// is what used to surface raw "Unexpected end of JSON input" / "Unexpected token '<'" errors.
const readJson = async (response: Response): Promise<any | undefined> => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const apiRequest = async (
  endpoint: string,
  method: string = 'GET',
  body?: any,
  customHeaders: Record<string, string> = {},
) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your internet connection and try again.",
      0,
      NETWORK_ERROR,
    );
  }

  const data = await readJson(response);

  if (data === undefined) {
    if (response.ok) return {}; // a success with no body — nothing to hand back
    throw new ApiError(
      'The server is unavailable right now. Please try again in a moment.',
      response.status,
      SERVER_UNAVAILABLE,
    );
  }

  if (!response.ok) {
    // Most endpoints return {error: {code, message}}, but a few (e.g. otp.controller) return a
    // flat {code, message} — fall back to that so callers still see the real reason (e.g. a
    // rate-limit message) instead of the generic default.
    throw new ApiError(
      data.error?.message || data.message || 'Something went wrong. Please try again.',
      response.status,
      data.error?.code || data.code || 'REQUEST_FAILED',
    );
  }

  return data;
};
