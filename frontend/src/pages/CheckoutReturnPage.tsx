import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Coffee,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
} from 'lucide-react';
import publicCheckoutService from '../services/public/checkout';
import publicMenuService from '../services/public/menu';
import { CheckoutSession } from '../services/public/checkout/types';
import { toast } from '@/utils/toast';

// Poll fast while the customer has most likely just paid, then back off: the backend's sweep
// confirms the payment either way, this only decides how soon this page notices.
const FAST_POLL_MS = 3_000;
const SLOW_POLL_MS = 10_000;
const FAST_POLL_WINDOW_MS = 60_000;
const GIVE_UP_AFTER_MS = 20 * 60_000;

const FAILED_PAYMENT_STATUSES = ['FAILED', 'EXPIRED'];

/**
 * Where SMEPay's hosted checkout sends the customer back to. Nothing here decides whether the
 * payment succeeded — the backend asks SMEPay itself — this page just waits for the order to
 * exist, and otherwise offers to try again or pay another way from the same saved cart.
 */
export const CheckoutReturnPage: React.FC = () => {
  const { slug, sessionId } = useParams<{ slug: string; sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [business, setBusiness] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [busyAction, setBusyAction] = useState<'retry' | 'CASH' | 'ONLINE' | null>(null);
  const startedAt = useRef(Date.now());

  const goToOrder = useCallback(
    (orderId: string) => navigate(`/c/${slug}/order/${orderId}`, { replace: true }),
    [navigate, slug],
  );

  // Returns true once there's nothing left to wait for.
  const applySession = useCallback(
    (next: CheckoutSession): boolean => {
      setSession(next);
      if ((next.status === 'PAID' || next.status === 'SWITCHED') && next.orderId) {
        goToOrder(next.orderId);
        return true;
      }
      return false;
    },
    [goToOrder],
  );

  useEffect(() => {
    if (!slug) return;
    publicMenuService
      .getBusinessBySlug(slug)
      .then((res) => setBusiness(res.data))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const res = await publicCheckoutService.getStatus(sessionId);
        if (cancelled || applySession(res.data)) return;
      } catch (err: any) {
        if (cancelled) return;
        if (/not found/i.test(err.message || '')) {
          setNotFound(true);
          return;
        }
      }
      const elapsed = Date.now() - startedAt.current;
      if (elapsed < GIVE_UP_AFTER_MS) {
        timer = setTimeout(poll, elapsed < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS);
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, applySession]);

  const handleRetry = async () => {
    if (!sessionId) return;
    setBusyAction('retry');
    try {
      const res = await publicCheckoutService.retry(sessionId);
      if (applySession(res.data)) return; // the previous attempt had gone through after all
      if (res.data.paymentUrl) {
        window.location.assign(res.data.paymentUrl);
        return;
      }
      setBusyAction(null);
    } catch (err: any) {
      toast.error(err.message || 'Could not restart the payment.');
      setBusyAction(null);
    }
  };

  const handleSwitch = async (method: 'CASH' | 'ONLINE') => {
    if (!sessionId) return;
    setBusyAction(method);
    try {
      const res = await publicCheckoutService.switchMethod(sessionId, method);
      if (!applySession(res.data)) setBusyAction(null);
    } catch (err: any) {
      toast.error(err.message || 'Could not place the order.');
      setBusyAction(null);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-3 max-w-sm w-full">
          <XCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-black text-slate-900">We couldn't find this payment</p>
          <Link
            to={`/c/${slug}`}
            className="inline-block text-xs font-bold text-emerald-700 underline"
          >
            Back to the menu
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <Coffee className="w-8 h-8 text-orange-500 animate-bounce mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Checking your payment…</p>
        </div>
      </div>
    );
  }

  const failed =
    session.status === 'EXPIRED' || FAILED_PAYMENT_STATUSES.includes(session.paymentStatus || '');
  const confirming = session.status === 'FINALIZING' || session.paymentStatus === 'SUCCESS';
  const amount = `₹${(session.amountPaise / 100).toFixed(2)}`;
  const busy = busyAction !== null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 max-w-md mx-auto border-x border-slate-200 font-sans pb-12">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 bg-white -mx-4 px-4 pt-2">
        <Link
          to={`/c/${slug}`}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure Payment
        </span>
        <span className="w-8" />
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3 mb-4">
        {failed ? (
          <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
        ) : (
          <Loader2 className="w-10 h-10 text-emerald-600 mx-auto animate-spin" />
        )}
        <div>
          <h2 className="text-lg font-black text-slate-900">
            {failed
              ? "Payment didn't go through"
              : confirming
                ? 'Payment received — placing your order'
                : 'Confirming your payment…'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {failed
              ? 'No money was taken for this attempt. Try again, or pay another way — your cart is saved.'
              : "This usually takes a few seconds. Keep this page open; we'll take you to your order automatically."}
          </p>
        </div>
        <p className="text-2xl font-black text-slate-900">{amount}</p>
        {business?.name && (
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {business.name}
          </p>
        )}
      </div>

      {!confirming && (
        <div
          className={`rounded-2xl border p-4 space-y-2 ${failed ? 'bg-white border-slate-200' : 'bg-slate-100/60 border-slate-200'}`}
        >
          {!failed && (
            <p className="text-[11px] font-bold text-slate-500 text-center">
              Didn't finish paying?{' '}
              {session.paymentUrl && (
                <a href={session.paymentUrl} className="text-emerald-700 underline">
                  Open the payment page again
                </a>
              )}
            </p>
          )}

          {session.attemptsLeft > 0 && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {busyAction === 'retry' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {failed ? 'Try Again' : 'Start a New Payment'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSwitch('CASH')}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {busyAction === 'CASH' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-4 h-4" />
            )}
            Pay at Counter Instead
          </button>

          {business?.upiVpa && (
            <button
              type="button"
              onClick={() => handleSwitch('ONLINE')}
              disabled={busy}
              className="w-full py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {busyAction === 'ONLINE' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4" />
              )}
              Pay by Direct UPI Instead
            </button>
          )}

          <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 pt-1">
            <CreditCard className="w-3 h-3" /> If a payment already went through, you'll be taken to
            that order instead.
          </p>
        </div>
      )}
    </div>
  );
};
