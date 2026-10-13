import { useCallback, useEffect, useRef, useState } from 'react';
import publicOrdersService from '@/services/public/orders';
import type { RecoverableOrder } from '@/services/public/orders/types';
import { mergeCurrentOrders, type CurrentOrder, type LocalOrder } from '@/utils/currentOrders';
import { forgetOrder, isFinishedStatus, ordersForCafe } from '@/utils/recentOrders';
import {
  clearRecoverySession,
  getRecoverySession,
  type StoredRecoverySession,
} from '@/utils/recoverySession';

/** How often the list re-reads statuses while the page is open and visible. */
const REFRESH_MS = 60_000;
/** More than this many remembered orders on one phone is not a real customer. */
const LOCAL_LOOKUPS = 5;

interface UseMyOrdersOptions {
  slug: string;
  /** The table QR the customer scanned, when there is one (the café is then known exactly). */
  qrToken?: string;
  /** An order the page is already showing, so it isn't listed as "another" one. */
  excludeId?: string;
}

const isGone = (err: any) => err?.status === 404 || /not found/i.test(String(err?.message));

/**
 * The customer's current orders at one café: everything in progress for the phone number they
 * verified here (read from the server with the saved 12-hour session, so no new code is needed),
 * plus any orders remembered on this device. Re-read every minute while the page is visible and
 * whenever the tab comes back to the foreground. An expired session just drops back to "verify
 * again"; a network blip keeps what is on screen.
 */
export function useMyOrders({ slug, qrToken, excludeId }: UseMyOrdersOptions) {
  const [orders, setOrders] = useState<CurrentOrder[]>([]);
  const [session, setSession] = useState<StoredRecoverySession | null>(() =>
    getRecoverySession(slug),
  );
  const [loading, setLoading] = useState(true);
  // Only the newest read may update the screen (a slow earlier one must not overwrite it).
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const run = ++latest.current;
    const saved = getRecoverySession(slug);
    setSession(saved);

    let fromServer: RecoverableOrder[] = [];
    if (saved) {
      try {
        const res = await publicOrdersService.recover({
          qrToken,
          businessSlug: qrToken ? undefined : slug,
          recoveryToken: saved.token,
        });
        fromServer = res.data || [];
        // Over on the server: no reason to keep the link on this device either.
        fromServer
          .filter((o) => isFinishedStatus(o.orderStatus))
          .forEach((o) => forgetOrder(o._id));
      } catch (err: any) {
        if (err?.code === 'SESSION_EXPIRED') {
          clearRecoverySession(slug);
          if (run === latest.current) setSession(null);
        } else {
          // Offline or briefly unavailable: keep showing what we have and try again next time.
          if (run === latest.current) setLoading(false);
          return;
        }
      }
    }

    const known = new Set(fromServer.map((o) => o._id));
    const remembered = ordersForCafe(slug)
      .filter((o) => !known.has(o.orderId) && o.orderId !== excludeId)
      .slice(0, LOCAL_LOOKUPS);
    const fromDevice = (
      await Promise.all(
        remembered.map(async (o): Promise<LocalOrder | null> => {
          try {
            const res = await publicOrdersService.get(o.orderId);
            const status = res.data.order?.orderStatus;
            if (isFinishedStatus(status)) {
              forgetOrder(o.orderId);
              return null;
            }
            return { orderId: o.orderId, orderNumber: o.orderNumber, status, savedAt: o.savedAt };
          } catch (err: any) {
            // Gone (or never real): stop offering it. A network blip keeps it, to be retried.
            if (isGone(err)) {
              forgetOrder(o.orderId);
              return null;
            }
            return { orderId: o.orderId, orderNumber: o.orderNumber, savedAt: o.savedAt };
          }
        }),
      )
    ).filter((o): o is LocalOrder => o !== null);

    if (run !== latest.current) return;
    setOrders(mergeCurrentOrders(fromServer, fromDevice, excludeId));
    setLoading(false);
  }, [slug, qrToken, excludeId]);

  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      latest.current += 1; // anything still in flight is ignored
    };
  }, [refresh]);

  /** "Not you?": forget the verified number on this device, so the next lookup asks for a code. */
  const forgetPhone = useCallback(() => {
    clearRecoverySession(slug);
    void refresh();
  }, [slug, refresh]);

  return { orders, session, loading, refresh, forgetPhone };
}
