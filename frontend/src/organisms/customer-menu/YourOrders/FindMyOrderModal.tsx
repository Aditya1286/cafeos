import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import Modal from '@/molecules/Modal';
import { inputCls } from '@/molecules/FormField';
import { OtpVerificationBlock } from '@/molecules/OtpVerificationBlock';
import { useOtpVerification } from '@/hooks/useOtpVerification';
import publicOrdersService from '@/services/public/orders';
import type { RecoverableOrder } from '@/services/public/orders/types';
import { isFinishedStatus, rememberOrder } from '@/utils/recentOrders';
import { saveRecoverySession } from '@/utils/recoverySession';
import { customerStatusLabel } from './orderStatusLabel';

interface FindMyOrderModalProps {
  slug: string;
  /** The table QR token, when the customer scanned one (the café is then known exactly). */
  qrToken?: string;
  cafeName?: string;
  onClose: () => void;
  /** Called once the number is verified, so the page can show its orders as "Your orders". */
  onFound?: () => void;
}

const maskPhone = (phone: string) => `${phone.slice(0, 2)}••••••${phone.slice(-2)}`;

/**
 * "Find my order" for a customer who lost the tracking link (cleared browser, new phone). They enter
 * the number they ordered with, confirm it with a one-time code sent to it, and get the links back
 * for that number's recent orders at this café. The code is always fresh: an earlier ordering
 * verification is not accepted, because it is keyed by number alone and would let anyone who knew
 * the number read that person's orders. A successful check also earns a 12-hour session kept on this
 * device (utils/recoverySession), so the code is not asked for again every time.
 */
export const FindMyOrderModal: React.FC<FindMyOrderModalProps> = ({
  slug,
  qrToken,
  cafeName,
  onClose,
  onFound,
}) => {
  const [phone, setPhone] = useState('');
  const otp = useOtpVerification(phone, 'recover-otp-captcha', { purpose: 'RECOVERY' });
  const [orders, setOrders] = useState<RecoverableOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askedFor = useRef<string | null>(null);

  // As soon as the code checks out, fetch the orders (once per verified number).
  useEffect(() => {
    if (!otp.otpVerified || askedFor.current === phone) return;
    askedFor.current = phone;
    setLoading(true);
    setError(null);
    publicOrdersService
      .recover({ qrToken, businessSlug: qrToken ? undefined : slug, customerPhone: phone.trim() })
      .then((res) => {
        const found = res.data || [];
        setOrders(found);
        found
          .filter((o) => !isFinishedStatus(o.orderStatus))
          .forEach((o) =>
            rememberOrder({
              orderId: o._id,
              slug,
              orderNumber: o.orderNumber,
              savedAt: Date.parse(o.createdAt) || Date.now(),
            }),
          );
        // Keep the verified number on this device for 12 hours: the page then lists all its current
        // orders (and the tracker its other orders) without asking for another code. Only a masked
        // form of the number is stored.
        if (res.session) {
          saveRecoverySession(slug, {
            token: res.session.token,
            expiresAt: Date.parse(res.session.expiresAt),
            phoneMask: maskPhone(phone.trim()),
          });
        }
        if (found.length > 0 || res.session) onFound?.();
      })
      .catch((err: any) => {
        askedFor.current = null;
        setError(err.message || 'Could not look up your order. Please try again.');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per verified number
  }, [otp.otpVerified]);

  const phoneOk = /^[6-9]\d{9}$/.test(phone.trim());

  return (
    <Modal title="Find my order" onClose={onClose}>
      <div className="space-y-4">
        {orders === null && (
          <>
            <p className="text-xs text-slate-500 font-medium">
              Lost your order page? Enter the phone number you ordered with
              {cafeName ? ` at ${cafeName}` : ''}. We’ll text you a code to confirm it’s you.
            </p>
            <div className="space-y-1.5">
              <label
                htmlFor="recover-phone"
                className="block text-xs font-extrabold text-slate-900"
              >
                Phone number
              </label>
              <input
                id="recover-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                className={inputCls}
              />
            </div>
            {phoneOk && (
              <OtpVerificationBlock
                otp={otp}
                captchaContainerId="recover-otp-captcha"
                destinationLabel={maskPhone(phone.trim())}
              />
            )}
            {(error || otp.error) && (
              <p role="alert" className="text-[11px] font-bold text-rose-600">
                {error || otp.error}
              </p>
            )}
            {loading && <p className="text-xs font-bold text-slate-400">Looking for your order…</p>}
          </>
        )}

        {orders !== null && orders.length === 0 && (
          <div className="text-center space-y-2 py-4">
            <Search className="w-8 h-8 text-slate-300 mx-auto" aria-hidden="true" />
            <p className="text-sm font-black text-slate-800">No recent orders found</p>
            <p className="text-xs text-slate-500 font-medium">
              We couldn’t find an order from this number at {cafeName || 'this café'} in the last 12
              hours. Check the number, or ask a team member for help.
            </p>
          </div>
        )}

        {orders !== null && orders.length > 0 && (
          <ul className="space-y-2" aria-label="Your recent orders">
            {orders.map((o) => (
              <li key={o._id}>
                <Link
                  to={`/c/${slug}/order/${o._id}`}
                  onClick={onClose}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-black text-orange-600 truncate">
                      Order #{o.orderNumber}
                    </span>
                    <span className="block text-[11px] font-semibold text-slate-500">
                      {customerStatusLabel(o.orderStatus)}
                      {o.tableName ? ` • ${o.tableName}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-extrabold text-slate-900 shrink-0">
                    Track <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default FindMyOrderModal;
