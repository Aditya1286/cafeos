// What the order request carries as proof of who is ordering: the device proof in the body, the
// stored guest pass in the X-Guest-Token header. Both are optional, and an order with neither is
// sent exactly as before.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as publicOrdersService from '../src/services/public/orders/orders';

const realFetch = globalThis.fetch;

const lastRequest = () => {
  const [url, init] = (globalThis.fetch as any).mock.calls[0];
  return { url: url as string, init: init as RequestInit & { headers: Record<string, string> } };
};

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  globalThis.fetch = vi.fn(
    async () => new Response(JSON.stringify({ success: true, data: { _id: 'o1' } }), { status: 200 }),
  ) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllGlobals();
});

const payload = {
  customerName: 'Asha',
  customerPhone: '9876543210',
  paymentMethod: 'CASH',
  items: [{ productId: 'p1', quantity: 1, name: 'Chai' }],
  businessSlug: 'cafe-a',
};

describe('placing an order with proofs', () => {
  test('sends the stored guest pass as X-Guest-Token and the device proof in the body', async () => {
    await publicOrdersService.create({ ...payload, deviceProof: 'proof.jwt.value' }, { guestToken: 'pass.jwt.value' });
    const { url, init } = lastRequest();
    expect(url).toBe('/api/v1/public/orders');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Guest-Token']).toBe('pass.jwt.value');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string).deviceProof).toBe('proof.jwt.value');
  });

  test('with no pass there is no X-Guest-Token header at all', async () => {
    await publicOrdersService.create(payload);
    expect(lastRequest().init.headers).not.toHaveProperty('X-Guest-Token');
    await publicOrdersService.create(payload, { guestToken: null });
    expect((globalThis.fetch as any).mock.calls[1][1].headers).not.toHaveProperty('X-Guest-Token');
    await publicOrdersService.create(payload, {});
    expect((globalThis.fetch as any).mock.calls[2][1].headers).not.toHaveProperty('X-Guest-Token');
  });

  test('with no device proof the body carries none', async () => {
    await publicOrdersService.create(payload, { guestToken: 'pass.jwt.value' });
    expect(JSON.parse(lastRequest().init.body as string)).not.toHaveProperty('deviceProof');
  });
});
