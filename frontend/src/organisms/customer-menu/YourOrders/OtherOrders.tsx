import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useMyOrders } from '@/hooks/useMyOrders';
import { customerStatusLabel } from './orderStatusLabel';

interface OtherOrdersProps {
  slug: string;
  /** The order the tracker is already showing. */
  currentOrderId: string;
}

/**
 * On an order's tracking page: the customer's OTHER orders in progress at this café, one tap away,
 * so a table with five orders doesn't have to go back and verify again to open the next one. Closed
 * by default (it is secondary to the order on screen) and absent when there is nothing else.
 */
export const OtherOrders: React.FC<OtherOrdersProps> = ({ slug, currentOrderId }) => {
  const { orders, session } = useMyOrders({ slug, excludeId: currentOrderId });
  const [open, setOpen] = useState(false);

  if (orders.length === 0) return null;

  return (
    <section
      aria-label="Your other orders"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-orange-600">
            Your other orders
          </span>
          <span className="block text-xs font-black text-slate-900">
            {orders.length} more in progress
            {session ? ` • ${session.phoneMask}` : ''}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul className="border-t border-slate-100 divide-y divide-slate-100">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                to={`/c/${slug}/order/${o.id}`}
                onClick={() => window.scrollTo({ top: 0 })}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-black text-orange-600 truncate">
                    Order{o.orderNumber ? ` #${o.orderNumber}` : ''}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-500">
                    {customerStatusLabel(o.status)}
                    {o.tableName ? ` • ${o.tableName}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-xs font-extrabold text-slate-900 shrink-0">
                  Open <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OtherOrders;
