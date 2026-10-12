// The kitchen flow is three steps: New (PLACED) -> Preparing (PREPARING) -> Ready (READY), then
// served/completed. Orders placed before the flow was merged may still be stored as CONFIRMED
// (the old "accepted, not started" step). Rather than rewriting that data, every read treats
// CONFIRMED as PREPARING, and the Order schema still accepts the value so such a document can be
// saved. Nothing writes it any more.

export const ORDER_STATUSES = ['PLACED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The only stored status that isn't in ORDER_STATUSES; it reads as PREPARING. */
export const LEGACY_CONFIRMED_STATUS = 'CONFIRMED';

/** Every value the orderStatus field can hold in the database. */
export const STORED_ORDER_STATUSES: string[] = [...ORDER_STATUSES, LEGACY_CONFIRMED_STATUS];

/** Maps a stored or incoming status onto the current flow. Also lets a browser tab opened before
 * the merge keep working: it still sends CONFIRMED, which is treated as PREPARING. */
export const normalizeOrderStatus = <T extends string>(status: T): Exclude<T, typeof LEGACY_CONFIRMED_STATUS> | 'PREPARING' =>
  (status === LEGACY_CONFIRMED_STATUS ? 'PREPARING' : status) as any;

/** A filter value for the orderStatus field that also finds legacy CONFIRMED orders under PREPARING. */
export const storedStatusFilter = (status: string): string | { $in: string[] } =>
  normalizeOrderStatus(status) === 'PREPARING' ? { $in: ['PREPARING', LEGACY_CONFIRMED_STATUS] } : status;

/** Statuses of an order the kitchen is still working on, for queries against stored data. */
export const IN_PROGRESS_STORED_STATUSES: string[] = ['PLACED', 'PREPARING', LEGACY_CONFIRMED_STATUS, 'READY'];

/** Hard cap on the live-orders list; far above anything a real rush produces, but it keeps one
 * response bounded if orders are ever left open by the thousand. */
export const ACTIVE_ORDERS_LIMIT = 500;

/** An order still in progress after this long was abandoned, not cooking. It stays in All Orders,
 * but the kitchen board doesn't treat it as live. */
export const ACTIVE_ORDER_WINDOW_HOURS = 24;
