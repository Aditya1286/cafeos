import { describe, it, expect } from 'vitest';
import {
  RECENT_ORDERS_KEY,
  RECENT_ORDER_MAX_AGE_MS,
  RECENT_ORDERS_MAX,
  forgetOrder,
  isFinishedStatus,
  ordersForCafe,
  rememberOrder,
} from '../src/utils/recentOrders';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};
const hex = (n: number) => n.toString(16).padStart(24, '0');
const entry = (n: number, slug = 'cafe-a', minutesAgo = 0) => ({
  orderId: hex(n),
  slug,
  orderNumber: `ORD-${n}`,
  savedAt: NOW - minutesAgo * 60_000,
});

describe('recent orders (kept on this phone so the tracker can be found again)', () => {
  it('remembers an order and offers it back for that café, newest first', () => {
    const s = store();
    rememberOrder(entry(1, 'cafe-a', 30), s, NOW);
    rememberOrder(entry(2, 'cafe-a', 5), s, NOW);
    rememberOrder(entry(3, 'cafe-b', 1), s, NOW);
    expect(ordersForCafe('cafe-a', s, NOW).map((o) => o.orderId)).toEqual([hex(2), hex(1)]);
    expect(ordersForCafe('cafe-b', s, NOW).map((o) => o.orderId)).toEqual([hex(3)]);
    expect(ordersForCafe('cafe-c', s, NOW)).toEqual([]);
  });

  it('remembering the same order again updates it instead of duplicating it', () => {
    const s = store();
    rememberOrder(entry(1, 'cafe-a', 20), s, NOW);
    rememberOrder({ ...entry(1, 'cafe-a', 0), orderNumber: 'ORD-NEW' }, s, NOW);
    const list = ordersForCafe('cafe-a', s, NOW);
    expect(list).toHaveLength(1);
    expect(list[0].orderNumber).toBe('ORD-NEW');
  });

  it('drops orders older than a day, and keeps only the most recent few', () => {
    const s = store();
    rememberOrder(entry(1, 'cafe-a', RECENT_ORDER_MAX_AGE_MS / 60_000 + 5), s, NOW);
    expect(ordersForCafe('cafe-a', s, NOW)).toEqual([]);
    for (let i = 10; i < 10 + RECENT_ORDERS_MAX + 3; i++)
      rememberOrder(entry(i, 'cafe-a', 10 - (i - 10) * 0.01), s, NOW);
    expect(ordersForCafe('cafe-a', s, NOW)).toHaveLength(RECENT_ORDERS_MAX);
  });

  it('forgets an order once it is finished', () => {
    const s = store();
    rememberOrder(entry(1), s, NOW);
    rememberOrder(entry(2), s, NOW);
    forgetOrder(hex(1), s, NOW);
    expect(ordersForCafe('cafe-a', s, NOW).map((o) => o.orderId)).toEqual([hex(2)]);
  });

  it('ignores a corrupt or tampered store instead of breaking the page', () => {
    for (const bad of [
      'not json',
      '{"a":1}',
      '[1,2,3]',
      '[{"orderId":"x"}]',
      '[{"orderId":"<script>","slug":"s","savedAt":1}]',
    ]) {
      expect(ordersForCafe('cafe-a', store({ [RECENT_ORDERS_KEY]: bad }), NOW)).toEqual([]);
    }
  });

  it('only ever keeps ids shaped like real order ids (they go into links)', () => {
    const s = store();
    rememberOrder({ ...entry(1), orderId: '../../admin' }, s, NOW);
    rememberOrder({ ...entry(2), slug: 'bad slug/..' }, s, NOW);
    expect(ordersForCafe('cafe-a', s, NOW)).toEqual([]);
    expect(ordersForCafe('bad slug/..', s, NOW)).toEqual([]);
  });

  it('never throws when storage is blocked or missing (private window)', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(ordersForCafe('cafe-a', blocked, NOW)).toEqual([]);
    expect(() => rememberOrder(entry(1), blocked, NOW)).not.toThrow();
    expect(() => forgetOrder(hex(1), blocked, NOW)).not.toThrow();
    expect(ordersForCafe('cafe-a', null, NOW)).toEqual([]);
    expect(() => rememberOrder(entry(1), null, NOW)).not.toThrow();
  });

  it('knows which statuses mean the order is over', () => {
    for (const s of ['COMPLETED', 'SERVED', 'CANCELLED', 'REFUNDED'])
      expect(isFinishedStatus(s)).toBe(true);
    for (const s of ['PLACED', 'PREPARING', 'READY', 'CONFIRMED', undefined])
      expect(isFinishedStatus(s)).toBe(false);
  });
});
