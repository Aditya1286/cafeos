import type { RecoverableOrder } from '@/services/public/orders/types';
import { isFinishedStatus } from './recentOrders';

/** One order in the "your orders" list: just enough to show its status and open its tracker. */
export interface CurrentOrder {
  id: string;
  orderNumber?: string;
  /** Undefined only for an order remembered on this device whose status could not be read yet. */
  status?: string;
  tableName?: string;
  /** Milliseconds since the epoch; the list is newest first. */
  createdAt: number;
}

/** An order remembered on this device (utils/recentOrders), with its status if it could be read. */
export interface LocalOrder {
  orderId: string;
  orderNumber?: string;
  status?: string;
  savedAt: number;
}

/**
 * The orders still in progress for this customer at this café: the ones the server lists for their
 * verified number, plus any remembered on this device that the server list does not have (an order
 * placed from here with another number). Finished orders are left out: this is the "current" list.
 * The server's data wins when both know an order. `excludeId` leaves out the order the page is
 * already showing.
 */
export const mergeCurrentOrders = (
  fromServer: RecoverableOrder[],
  fromDevice: LocalOrder[],
  excludeId?: string,
): CurrentOrder[] => {
  const byId = new Map<string, CurrentOrder>();
  for (const o of fromDevice) {
    byId.set(o.orderId, {
      id: o.orderId,
      orderNumber: o.orderNumber,
      status: o.status,
      createdAt: o.savedAt,
    });
  }
  for (const o of fromServer) {
    byId.set(o._id, {
      id: o._id,
      orderNumber: o.orderNumber,
      status: o.orderStatus,
      tableName: o.tableName,
      createdAt: Date.parse(o.createdAt) || 0,
    });
  }
  return [...byId.values()]
    .filter((o) => o.id !== excludeId && !isFinishedStatus(o.status))
    .sort((a, b) => b.createdAt - a.createdAt);
};
