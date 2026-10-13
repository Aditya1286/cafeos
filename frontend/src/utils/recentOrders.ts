// Orders this phone has placed (or looked up), kept in local storage so the customer can get back to
// their live tracker after closing the tab. The tracking link's order id lives only in the URL;
// without this a customer who loses the tab has no way back (see also "Find my order").
//
// Storage can be blocked or throw (private windows), so everything here is a convenience: it never
// throws, and a missing or corrupt store just means "nothing remembered".

export const RECENT_ORDERS_KEY = 'caos_recent_orders';
export const RECENT_ORDER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const RECENT_ORDERS_MAX = 5;

export interface RememberedOrder {
  /** The order's Mongo id: what the tracking link carries. */
  orderId: string;
  /** The café's slug, for the link and to show orders on the right café's menu. */
  slug: string;
  orderNumber?: string;
  savedAt: number;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// Ids and slugs end up inside links, so only the shapes the app itself produces are accepted.
const ORDER_ID = /^[0-9a-f]{24}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/i;

const valid = (o: unknown): o is RememberedOrder => {
  if (!o || typeof o !== 'object') return false;
  const e = o as Record<string, unknown>;
  return (
    typeof e.orderId === 'string' &&
    ORDER_ID.test(e.orderId) &&
    typeof e.slug === 'string' &&
    SLUG.test(e.slug) &&
    typeof e.savedAt === 'number' &&
    Number.isFinite(e.savedAt) &&
    (e.orderNumber === undefined ||
      (typeof e.orderNumber === 'string' && e.orderNumber.length <= 40))
  );
};

const read = (store: KeyValueStore | null, now: number): RememberedOrder[] => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(RECENT_ORDERS_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(valid).filter((o) => now - o.savedAt < RECENT_ORDER_MAX_AGE_MS);
  } catch {
    return [];
  }
};

const write = (store: KeyValueStore | null, orders: RememberedOrder[]) => {
  try {
    store?.setItem(RECENT_ORDERS_KEY, JSON.stringify(orders.slice(0, RECENT_ORDERS_MAX)));
  } catch {
    /* storage unavailable: the order just won't be remembered */
  }
};

/** Saves (or refreshes) an order. Newest first, deduplicated, capped, expired ones dropped. */
export const rememberOrder = (
  order: RememberedOrder,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): void => {
  if (!valid(order)) return;
  const others = read(store, now).filter((o) => o.orderId !== order.orderId);
  write(
    store,
    [order, ...others].sort((a, b) => b.savedAt - a.savedAt),
  );
};

export const forgetOrder = (
  orderId: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): void => {
  write(
    store,
    read(store, now).filter((o) => o.orderId !== orderId),
  );
};

/** The remembered orders for one café, newest first. */
export const ordersForCafe = (
  slug: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): RememberedOrder[] =>
  read(store, now)
    .filter((o) => o.slug === slug)
    .sort((a, b) => b.savedAt - a.savedAt);

/** Statuses after which there is nothing left to track. */
export const isFinishedStatus = (status: string | undefined): boolean =>
  status === 'COMPLETED' || status === 'SERVED' || status === 'CANCELLED' || status === 'REFUNDED';
