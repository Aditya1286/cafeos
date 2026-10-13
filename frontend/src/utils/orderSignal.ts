import { CUSTOMER_WAIT } from '@/constants/kitchen';

/** Which mascot reaction an order calls for. These keys are `signals` in the order page's mascot
 * config (mascot/config.ts). */
export type OrderSignal =
  'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'wait-long' | 'wait-longer';

const placedAt = (value: string | Date | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

/** The reaction for an order at `now`: its status, except that a New or Preparing order that has
 * been waiting past the thresholds in constants/kitchen gets the calming ones. Null until the order
 * has loaded. Pure. */
export const orderSignal = (
  order: { orderStatus?: string; createdAt?: string | Date | null } | null | undefined,
  now: number,
): OrderSignal | null => {
  if (!order?.orderStatus) return null;
  switch (order.orderStatus) {
    case 'CANCELLED':
    case 'REFUNDED':
      return 'cancelled';
    case 'COMPLETED':
    case 'SERVED':
      return 'completed';
    case 'READY':
      return 'ready';
    case 'PLACED':
    case 'PREPARING':
    case 'CONFIRMED': {
      const t = placedAt(order.createdAt);
      const minutes = t === null ? 0 : Math.max(0, (now - t) / 60_000);
      if (minutes >= CUSTOMER_WAIT.asksMin) return 'wait-longer';
      if (minutes >= CUSTOMER_WAIT.calmMin) return 'wait-long';
      return order.orderStatus === 'PLACED' ? 'placed' : 'preparing';
    }
    default:
      return null;
  }
};
