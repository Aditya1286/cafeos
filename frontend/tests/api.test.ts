// apiRequest's error handling: whatever goes wrong between the browser and the backend, callers
// get an ApiError with a message fit for a user — never a raw JSON parser error.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiRequest, ApiError, setAuthToken } from '../src/services/api';

const respondWith = (body: string, init: ResponseInit) => {
  globalThis.fetch = vi.fn(async () => new Response(body, init)) as unknown as typeof fetch;
};

const failure = async (): Promise<ApiError> => {
  try {
    await apiRequest('/auth/me');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('apiRequest resolved, expected it to reject');
};

const realFetch = globalThis.fetch;

beforeEach(() => {
  // Tests run in Node — give api.ts the localStorage it reads the login token from.
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllGlobals();
});

describe('backend not running / unreachable', () => {
  test("Vite's dev proxy: empty 500 text/plain (the reported 'Unexpected end of JSON input')", async () => {
    respondWith('', { status: 500, headers: { 'Content-Type': 'text/plain' } });
    const error = await failure();
    expect(error.code).toBe('SERVER_UNAVAILABLE');
    expect(error.message).toBe(
      'The server is unavailable right now. Please try again in a moment.',
    );
    expect(error.message).not.toMatch(/JSON/);
  });

  test("a gateway's HTML 502 page (the production 'Unexpected token <' variant)", async () => {
    respondWith('<html><body><h1>502 Bad Gateway</h1></body></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });
    const error = await failure();
    expect(error.code).toBe('SERVER_UNAVAILABLE');
    expect(error.status).toBe(502);
  });

  test('no response at all (offline, DNS, refused)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const error = await failure();
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(0);
  });
});

describe('backend answered', () => {
  test('its JSON error message and code reach the caller', async () => {
    respondWith(
      JSON.stringify({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const error = await failure();
    expect(error.message).toBe('Invalid email or password.');
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error.status).toBe(401);
  });

  test('a flat {code, message} error (otp.controller style) is understood too', async () => {
    respondWith(
      JSON.stringify({ success: false, code: 'RATE_LIMITED', message: 'Too many requests.' }),
      { status: 429 },
    );
    const error = await failure();
    expect(error.message).toBe('Too many requests.');
    expect(error.code).toBe('RATE_LIMITED');
  });

  test('success returns the parsed body, and sends the saved login token', async () => {
    setAuthToken('abc');
    respondWith(JSON.stringify({ success: true, data: { id: 1 } }), { status: 200 });
    await expect(apiRequest('/auth/me')).resolves.toEqual({ success: true, data: { id: 1 } });
    const [, init] = (globalThis.fetch as any).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc');
  });
});
