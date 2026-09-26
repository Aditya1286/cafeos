import React from 'react';
import { FileText, Clock, ArrowRight, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/money';

interface RecentOrdersListProps {
  orders: any[];
  onViewAllOrders?: () => void;
  onViewBill: (orderId: string) => void;
  onConfirmPayment: (order: any) => void;
}

/** The latest few orders under the KDS columns, with quick payment/bill actions. */
export const RecentOrdersList = ({
  orders,
  onViewAllOrders,
  onViewBill,
  onConfirmPayment,
}: RecentOrdersListProps) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900 truncate">Recent Orders</h3>
          <p className="text-[11px] font-medium text-slate-500 truncate">
            The last few orders placed
          </p>
        </div>
      </div>

      {onViewAllOrders && (
        <button
          onClick={onViewAllOrders}
          className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline shrink-0"
        >
          <span>View All Orders</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    <div className="divide-y divide-slate-100">
      {orders.slice(0, 4).map((o) => (
        <div
          key={o._id || o.orderId}
          className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-black text-slate-900 shrink-0">
              {o.orderId || o.orderNumber}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                <span className="truncate">{o.customerName}</span>
                <span className="text-[10px] text-slate-400 font-normal shrink-0">
                  ({o.tableName || 'Takeaway'})
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
            <div className="text-right shrink-0">
              <div className="text-xs font-black text-emerald-600">
                {formatCurrency(o.totalAmountPaise)}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {o.paymentMethod || 'ONLINE'} · {o.paymentStatus || 'PAID'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {o.paymentStatus === 'UNPAID' && (
                <button
                  onClick={() => onConfirmPayment(o)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{o.customerMarkedPaidAt ? 'Confirm' : 'Mark Paid'}</span>
                </button>
              )}

              <button
                onClick={() => onViewBill(o.orderId || o._id)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Bill</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RecentOrdersList;
