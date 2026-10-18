import { RefreshCw, FileText, Search, Undo2, Clock } from 'lucide-react';
import { STATUS_CONFIG } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { MobileOverview, StickyBar, PillRow, PagerBar, PillOption } from '@/molecules/MobileList';
import { RefundsPanelProps } from './RefundsPanel';

// The one filter this tab has, as pills instead of a dropdown.
const PAYMENT_PILLS: PillOption[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PAID', label: 'Needs refund' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'UNPAID', label: 'Never paid' },
];

const needsRefund = (o: any) => o.orderStatus === 'CANCELLED' && o.paymentStatus === 'PAID';

const Stat = ({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string | number;
  sub: string;
  warn?: boolean;
}) => (
  <div className="bg-slate-50 p-2.5 rounded-xl">
    <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
      {label}
    </span>
    <div className={`text-base font-black truncate ${warn ? 'text-amber-600' : 'text-slate-900'}`}>
      {value}
    </div>
    <div className="text-[10px] font-semibold text-slate-400">{sub}</div>
  </div>
);

/**
 * Refunds & Cancellations on a phone, laid out like the Orders tab: the overview is one line
 * (closed until tapped), the payment filter is a row of pills, and each order is a short row.
 */
export const RefundsPanelMobile = ({
  orders,
  loading,
  insights,
  pagination,
  onPageChange,
  searchQuery,
  onSearchChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  onRefresh,
  onViewHistory,
  onMarkRefunded,
}: RefundsPanelProps) => (
  <div className="space-y-3">
    <MobileOverview
      summary={
        insights ? (
          <>
            {insights.totalCancellations} cancellations
            <span className={insights.needsRefundCount > 0 ? 'text-amber-600' : 'text-slate-500'}>
              {' '}
              · {insights.needsRefundCount} need refund
            </span>
          </>
        ) : (
          'Refunds & cancellations'
        )
      }
      onRefresh={onRefresh}
      refreshing={loading}
    >
      {insights && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat
              label="Cancellations"
              value={insights.totalCancellations}
              sub={`${insights.unpaidCancellationsCount} never paid`}
            />
            <Stat
              label="Needs refund"
              value={insights.needsRefundCount}
              sub={`${insights.refundRequestedCount} requested`}
              warn={insights.needsRefundCount > 0}
            />
            <Stat
              label="Refunded"
              value={formatCurrency(insights.totalRefundedAmountPaise)}
              sub={`${insights.totalRefundedCount} orders`}
            />
            <Stat
              label="Avg. time to refund"
              value={
                insights.avgRefundTurnaroundHours !== null
                  ? `${insights.avgRefundTurnaroundHours}h`
                  : '—'
              }
              sub="Request → confirmed"
            />
          </div>
          {insights.paymentMethodBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {insights.paymentMethodBreakdown.map((pm) => (
                <span
                  key={pm._id}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"
                >
                  <span className="font-black text-slate-900">{pm._id}</span>
                  <span className="text-slate-500 font-semibold">
                    {' '}
                    · {pm.count} · {formatCurrency(pm.amountPaise)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </MobileOverview>

    <StickyBar>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search order, name or phone…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-base sm:text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
        />
      </div>
      <PillRow
        options={PAYMENT_PILLS}
        value={paymentStatusFilter}
        onChange={onPaymentStatusFilterChange}
      />
    </StickyBar>

    {loading ? (
      <div className="py-12 text-center space-y-3">
        <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading refunds & cancellations…</p>
      </div>
    ) : orders.length === 0 ? (
      <div className="py-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-sm font-black text-slate-800">No cancellations or refunds found</h3>
        <p className="text-xs font-medium text-slate-500">Try adjusting your search or filter.</p>
      </div>
    ) : (
      <ul className="space-y-2">
        {orders.map((o) => {
          const sc = STATUS_CONFIG[o.orderStatus] || STATUS_CONFIG.CANCELLED;
          return (
            <li key={o._id || o.orderId}>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs px-3.5 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[11px] font-black text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-md">
                      {o.orderId || o.orderNumber}
                    </span>
                    <span className="ml-1.5 text-[10px] text-slate-400 font-semibold">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 text-sm whitespace-nowrap">
                    {formatCurrency(o.totalAmountPaise)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold text-slate-700">
                    {o.customerName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black border whitespace-nowrap shrink-0 ${sc.badgeBg} ${sc.badgeText}`}
                  >
                    ● {sc.label}
                  </span>
                </div>

                {needsRefund(o) && (
                  <span
                    className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                      o.refundRequestedAt
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {o.refundRequestedAt ? 'Refund requested' : 'Needs refund'}
                  </span>
                )}

                {o.refundReason && (
                  <p className="text-[11px] text-slate-600 italic truncate">"{o.refundReason}"</p>
                )}

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onViewHistory(o)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black"
                  >
                    <Clock className="w-3.5 h-3.5" /> History
                  </button>
                  {needsRefund(o) && (
                    <button
                      type="button"
                      onClick={() => onMarkRefunded(o)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 text-[11px] font-black"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Mark Refunded
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    )}

    <PagerBar
      page={pagination.page}
      totalPages={pagination.totalPages}
      onPageChange={onPageChange}
    />
  </div>
);

export default RefundsPanelMobile;
