import { describe, it, expect } from 'vitest';
import { mergeOrders, sortOldestFirst, waitInfo } from '../src/utils/kitchenOrders';
import { KDS_WAIT } from '../src/constants/kitchen';

const T0 = Date.parse('2026-10-14T12:00:00Z');
const at = (minutesAgo: number) => new Date(T0 - minutesAgo * 60_000).toISOString();
const order = (id: string, minutesAgo: number | null, extra: Record<string, unknown> = {}) => ({
  _id: id,
  orderId: `ORD-${id}`,
  orderStatus: 'PLACED',
  ...(minutesAgo === null ? {} : { createdAt: at(minutesAgo) }),
  ...extra,
});
const ids = (orders: { _id: string }[]) => orders.map((o) => o._id);

describe('mergeOrders', () => {
  it('combines the recent list and the live list without duplicates, newest first', () => {
    const recent = [order('c', 1), order('b', 5), order('a', 9)];
    const live = [order('a', 9), order('x', 40), order('y', 70)]; // x, y are old but still live
    expect(ids(mergeOrders(recent, live))).toEqual(['c', 'b', 'a', 'x', 'y']);
  });

  it('shows an order that is only in the live list (older than the 25 newest)', () => {
    const recent = Array.from({ length: 25 }, (_, i) => order(`r${i}`, i + 1));
    const live = [order('old-new-order', 300)];
    const merged = mergeOrders(recent, live);
    expect(merged).toHaveLength(26);
    expect(ids(merged)).toContain('old-new-order');
  });

  it('prefers the live copy of an order that is in both lists', () => {
    const recent = [order('a', 5, { orderStatus: 'PLACED' })];
    const live = [order('a', 5, { orderStatus: 'PREPARING' })];
    expect(mergeOrders(recent, live)[0].orderStatus).toBe('PREPARING');
  });

  it('copes with either list being empty, and does not mutate its inputs', () => {
    const recent = [order('b', 1), order('a', 2)];
    const live: ReturnType<typeof order>[] = [];
    const before = JSON.stringify(recent);
    expect(ids(mergeOrders(recent, live))).toEqual(['b', 'a']);
    expect(ids(mergeOrders([], recent))).toEqual(['b', 'a']);
    expect(mergeOrders([], [])).toEqual([]);
    expect(JSON.stringify(recent)).toBe(before);
  });

  it('keeps an order that has no createdAt, at the end', () => {
    expect(ids(mergeOrders([order('n', null), order('a', 3)], []))).toEqual(['a', 'n']);
  });
});

describe('sortOldestFirst', () => {
  it('puts the order that has waited longest first', () => {
    const sorted = sortOldestFirst([order('new', 1), order('old', 30), order('mid', 10)]);
    expect(ids(sorted)).toEqual(['old', 'mid', 'new']);
  });

  it('is stable for orders placed at the same moment, and leaves the input alone', () => {
    const input = [order('a', 5), order('b', 5), order('c', 5)];
    const snapshot = ids(input);
    expect(ids(sortOldestFirst(input))).toEqual(['a', 'b', 'c']);
    expect(ids(input)).toEqual(snapshot);
  });

  it('treats an order with no usable time as the newest, so it never jumps the queue', () => {
    const sorted = sortOldestFirst([
      order('nodate', null),
      order('bad', null, { createdAt: 'nonsense' }),
      order('old', 20),
    ]);
    expect(ids(sorted)).toEqual(['old', 'nodate', 'bad']);
  });
});

describe('waitInfo', () => {
  it('reports minutes and stays calm for a fresh order', () => {
    expect(waitInfo(at(0), T0)).toMatchObject({ minutes: 0, level: 'ok', label: '<1m' });
    expect(waitInfo(at(4), T0)).toMatchObject({ minutes: 4, level: 'ok', label: '4m' });
  });

  it('turns amber, then red, at the configured thresholds', () => {
    expect(waitInfo(at(KDS_WAIT.warnMin - 1), T0)?.level).toBe('ok');
    expect(waitInfo(at(KDS_WAIT.warnMin), T0)?.level).toBe('warn');
    expect(waitInfo(at(KDS_WAIT.lateMin - 1), T0)?.level).toBe('warn');
    expect(waitInfo(at(KDS_WAIT.lateMin), T0)?.level).toBe('late');
    expect(waitInfo(at(500), T0)?.level).toBe('late');
  });

  it('switches to hours once a wait passes an hour', () => {
    expect(waitInfo(at(60), T0)?.label).toBe('1h 00m');
    expect(waitInfo(at(125), T0)?.label).toBe('2h 05m');
  });

  it('never goes negative when the dashboard clock is a little behind the server', () => {
    expect(waitInfo(at(-3), T0)).toMatchObject({ minutes: 0, level: 'ok', label: '<1m' });
  });

  it('returns null when there is no usable time (so nothing misleading is drawn)', () => {
    expect(waitInfo(undefined, T0)).toBeNull();
    expect(waitInfo('not a date', T0)).toBeNull();
    expect(waitInfo(null, T0)).toBeNull();
  });

  it('accepts a Date or an ISO string', () => {
    expect(waitInfo(new Date(T0 - 7 * 60_000), T0)?.minutes).toBe(7);
  });

  it('has sane thresholds', () => {
    expect(KDS_WAIT.warnMin).toBeGreaterThan(0);
    expect(KDS_WAIT.lateMin).toBeGreaterThan(KDS_WAIT.warnMin);
  });
});
