import { KDS_WAIT } from '@/constants/kitchen';

// Pure helpers for the kitchen board: no React, no network, so they are easy to test and reuse.

interface OrderLike {
  _id?: string;
  orderId?: string;
  createdAt?: string | Date | null;
}

/** Epoch ms of an order's placement time, or null when it is missing or unreadable. */
const placedAt = (value: string | Date | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

const keyOf = (o: OrderLike) => o._id ?? o.orderId ?? '';

/**
 * One list out of the newest-orders list (history, recent-orders strip, payments) and the live list
 * (every order still being worked on): no duplicates, newest first, the shape the rest of the
 * dashboard already expects. When an order is in both, the live copy wins. The live list is what
 * makes a long queue complete: its older orders are not among the newest 25.
 */
export const mergeOrders = <T extends OrderLike>(recent: T[], live: T[]): T[] => {
  const byKey = new Map<string, T>();
  for (const o of recent) byKey.set(keyOf(o), o);
  for (const o of live) byKey.set(keyOf(o), o);
  return [...byKey.values()]
    .map((order, index) => ({ order, index, t: placedAt(order.createdAt) }))
    .sort((a, b) => {
      // Orders with no usable time go last; everything else newest first, ties in arrival order.
      const at = a.t ?? -Infinity;
      const bt = b.t ?? -Infinity;
      return bt - at || a.index - b.index;
    })
    .map((x) => x.order);
};

/** Oldest first: the order that has waited longest is the one to cook next. Orders with no usable
 * time sort last so an odd record can never jump the queue. Returns a new array. */
export const sortOldestFirst = <T extends OrderLike>(orders: T[]): T[] =>
  orders
    .map((order, index) => ({ order, index, t: placedAt(order.createdAt) }))
    .sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity) || a.index - b.index)
    .map((x) => x.order);

export type WaitLevel = 'ok' | 'warn' | 'late';

export interface WaitInfo {
  minutes: number;
  level: WaitLevel;
  /** "<1m", "12m", "1h 05m". */
  label: string;
}

/** How long an order has been waiting at `now`, how urgent that is, and how to print it. Null when
 * the placement time is missing, so a ticket shows nothing rather than something wrong. */
export const waitInfo = (
  createdAt: string | Date | null | undefined,
  now: number,
): WaitInfo | null => {
  const t = placedAt(createdAt);
  if (t === null) return null;
  // A clock a little behind the server's must not show a negative wait.
  const minutes = Math.max(0, Math.floor((now - t) / 60_000));
  const level: WaitLevel =
    minutes >= KDS_WAIT.lateMin ? 'late' : minutes >= KDS_WAIT.warnMin ? 'warn' : 'ok';
  const label =
    minutes < 1
      ? '<1m'
      : minutes < 60
        ? `${minutes}m`
        : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  return { minutes, level, label };
};
