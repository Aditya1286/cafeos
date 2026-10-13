import { describe, it, expect } from 'vitest';
import { orderSignal } from '../src/utils/orderSignal';
import { CUSTOMER_WAIT } from '../src/constants/kitchen';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const placed = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();
const order = (orderStatus: string, minutesAgo = 1) => ({
  orderStatus,
  createdAt: placed(minutesAgo),
});

describe('orderSignal', () => {
  it('follows the order status for a fresh order', () => {
    expect(orderSignal(order('PLACED'), NOW)).toBe('placed');
    expect(orderSignal(order('PREPARING'), NOW)).toBe('preparing');
    expect(orderSignal(order('READY'), NOW)).toBe('ready');
    expect(orderSignal(order('COMPLETED'), NOW)).toBe('completed');
    expect(orderSignal(order('CANCELLED'), NOW)).toBe('cancelled');
    expect(orderSignal(order('REFUNDED'), NOW)).toBe('cancelled');
  });

  it('calms the customer once a New or Preparing order passes the first threshold, then points at staff', () => {
    for (const status of ['PLACED', 'PREPARING', 'CONFIRMED']) {
      expect(orderSignal(order(status, CUSTOMER_WAIT.calmMin - 1), NOW)).not.toMatch(/wait/);
      expect(orderSignal(order(status, CUSTOMER_WAIT.calmMin), NOW)).toBe('wait-long');
      expect(orderSignal(order(status, CUSTOMER_WAIT.asksMin - 1), NOW)).toBe('wait-long');
      expect(orderSignal(order(status, CUSTOMER_WAIT.asksMin), NOW)).toBe('wait-longer');
    }
  });

  it('never calms an order that is already ready, served or cancelled, however old it is', () => {
    for (const status of ['READY', 'COMPLETED', 'SERVED', 'CANCELLED']) {
      expect(orderSignal(order(status, 300), NOW)).not.toMatch(/wait/);
    }
  });

  it('is null until the order has loaded, and for an unknown status', () => {
    expect(orderSignal(null, NOW)).toBeNull();
    expect(orderSignal(undefined, NOW)).toBeNull();
    expect(orderSignal({}, NOW)).toBeNull();
    expect(orderSignal(order('MYSTERY'), NOW)).toBeNull();
  });

  it('treats a missing or unreadable placement time as just placed, not as a long wait', () => {
    expect(orderSignal({ orderStatus: 'PREPARING' }, NOW)).toBe('preparing');
    expect(orderSignal({ orderStatus: 'PLACED', createdAt: 'nonsense' }, NOW)).toBe('placed');
  });

  it('has sane thresholds: calm at ten minutes, staff later', () => {
    expect(CUSTOMER_WAIT.calmMin).toBe(10);
    expect(CUSTOMER_WAIT.asksMin).toBeGreaterThan(CUSTOMER_WAIT.calmMin);
  });
});
