import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';
import { useMyOrders } from '@/hooks/useMyOrders';
import { FindMyOrderModal } from './FindMyOrderModal';
import { customerStatusLabel } from './orderStatusLabel';

interface YourOrdersProps {
  slug: string;
  qrToken?: string;
  cafeName?: string;
}

/**
 * On the café's menu: this customer's orders still in progress, each a tap back to its tracker.
 * Once they have verified their number (a one-time code, remembered on this device for 12 hours)
 * it is their personal order list for the number: every current order at this café, kept fresh,
 * with no new code needed. Before that it shows the orders remembered on this phone, plus a quiet
 * "Already ordered? Find your order" for a customer who has lost them (cleared browser, new phone).
 */
export const YourOrders: React.FC<YourOrdersProps> = ({ slug, qrToken, cafeName }) => {
  const { orders, session, refresh, forgetPhone } = useMyOrders({ slug, qrToken });
  const [finding, setFinding] = useState(false);
  // Open for a couple of orders, closed for more so a long list doesn't push the menu off the
  // screen. Once the customer toggles it, their choice wins.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? orders.length <= 2;

  const startFinding = () => {
    // "Not you?": drop the saved number first, so the form below asks for a fresh code.
    if (session) forgetPhone();
    setFinding(true);
  };

  return (
    <section aria-label="Your orders" className="px-4 pt-3 space-y-2">
      {orders.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setToggled(!open)}
            aria-expanded={open}
            aria-controls="your-orders-list"
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <span className="text-[11px] font-bold text-slate-500">
              <span className="font-extrabold text-slate-900">Your orders</span> • {orders.length}{' '}
              in progress
              {session && (
                <>
                  {' '}
                  • <span className="font-mono text-slate-800">{session.phoneMask}</span>
                </>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {open && (
            <div id="your-orders-list" className="space-y-2">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to={`/c/${slug}/order/${o.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
                      Your order{o.orderNumber ? ` #${o.orderNumber}` : ''}
                    </span>
                    <span className="block text-xs font-black text-slate-900 truncate">
                      {customerStatusLabel(o.status)}
                      {o.tableName ? ` • ${o.tableName}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-extrabold text-orange-700 shrink-0">
                    Track <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {session && orders.length === 0 && (
        <p className="text-[11px] font-bold text-slate-500">
          Orders for <span className="font-mono text-slate-800">{session.phoneMask}</span>
          <span className="font-medium text-slate-400"> • none in progress</span>
        </p>
      )}

      <button
        type="button"
        onClick={startFinding}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 decoration-slate-300"
      >
        <Search className="w-3 h-3" aria-hidden="true" />
        {session
          ? 'Not you? Use a different number'
          : orders.length > 0
            ? 'Another order?'
            : 'Already ordered? Find your order'}
      </button>

      {finding && (
        <FindMyOrderModal
          slug={slug}
          qrToken={qrToken}
          cafeName={cafeName}
          onClose={() => setFinding(false)}
          onFound={() => void refresh()}
        />
      )}
    </section>
  );
};

export default YourOrders;
