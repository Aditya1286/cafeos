import { describe, it, expect } from 'vitest';
import { mergeCurrentOrders } from '../src/utils/currentOrders';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const MIN = 60_000;
const hex = (n: number) => n.toString(16).padStart(24, '0');
const server = (n: number, status: string, minutesAgo: number, tableName?: string) => ({
  _id: hex(n),
  orderNumber: `ORD-${n}`,
  orderStatus: status,
  tableName,
  totalAmountPaise: 10000,
  createdAt: new Date(NOW - minutesAgo * MIN).toISOString(),
});
const local = (n: number, status: string | undefined, minutesAgo: number) => ({
  orderId: hex(n),
  orderNumber: `ORD-${n}`,
  status,
  savedAt: NOW - minutesAgo * MIN,
});

describe('current orders (what "my orders" lists)', () => {
  it('lists every order still in progress, newest first', () => {
    const merged = mergeCurrentOrders(
      [server(1, 'PREPARING', 30), server(2, 'PLACED', 5), server(3, 'READY', 15)],
      [],
    );
    expect(merged.map((o) => o.id)).toEqual([hex(2), hex(3), hex(1)]);
    expect(merged[0]).toMatchObject({ orderNumber: 'ORD-2', status: 'PLACED' });
  });

  it('leaves out orders that are over, so the list is only what is current', () => {
    const merged = mergeCurrentOrders(
      [
        server(1, 'COMPLETED', 40),
        server(2, 'CANCELLED', 30),
        server(3, 'REFUNDED', 20),
        server(4, 'SERVED', 10),
        server(5, 'READY', 5),
      ],
      [],
    );
    expect(merged.map((o) => o.id)).toEqual([hex(5)]);
  });

  it('adds orders only remembered on this device, once, with the server’s data winning', () => {
    const merged = mergeCurrentOrders(
      [server(1, 'READY', 20, 'Table 4')],
      [local(1, 'PLACED', 20), local(9, 'PREPARING', 3)],
    );
    expect(merged.map((o) => o.id)).toEqual([hex(9), hex(1)]);
    expect(merged.find((o) => o.id === hex(1))).toMatchObject({
      status: 'READY',
      tableName: 'Table 4',
    });
  });

  it('drops a remembered order whose status turned out to be over', () => {
    expect(
      mergeCurrentOrders([], [local(1, 'COMPLETED', 10), local(2, 'PLACED', 10)]).map((o) => o.id),
    ).toEqual([hex(2)]);
  });

  it('keeps a remembered order whose status is not known yet (a network blip)', () => {
    const merged = mergeCurrentOrders([], [local(1, undefined, 10)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBeUndefined();
  });

  it('can leave one order out (the one the page is already showing)', () => {
    const merged = mergeCurrentOrders(
      [server(1, 'PLACED', 5), server(2, 'PLACED', 10)],
      [local(1, 'PLACED', 5)],
      hex(1),
    );
    expect(merged.map((o) => o.id)).toEqual([hex(2)]);
  });

  it('copes with nothing at all', () => {
    expect(mergeCurrentOrders([], [])).toEqual([]);
  });
});
