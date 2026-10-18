import { useState } from 'react';
import { RefreshCw, Search, SlidersHorizontal, FileText, MoreHorizontal, X } from 'lucide-react';
import { STATUS_CONFIG } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { StatusBadge } from '@/atoms/StatusBadge';
import { Modal } from '@/molecules/Modal';
import { MobileOverview, StickyBar, PillRow, PagerBar } from '@/molecules/MobileList';
import { OrderHistoryPanelProps } from './OrderHistoryPanel';
import { OrderHistoryFilterSheet } from './OrderHistoryFilterSheet';
import {
  ACTION_BUTTON_CLASS,
  PAYMENT_BADGE_TONE,
  availableActions,
  needsRefund,
} from './orderActions';
import {
  DATE_CHOICES,
  METHOD_CHOICES,
  PAYMENT_CHOICES,
  STATUS_PILLS,
  labelOf,
} from './filterOptions';

/**
 * The Orders tab on a phone. Built to keep the first orders on screen: the overview is one line
 * (closed until tapped), the filters sit behind one button, status is a row of pills, and each
 * order is a short row. The search bar and pills stay at the top while the list scrolls.
 */
export const OrderHistoryPanelMobile = ({
  business,
  orderHistory,
  todaySalesPaise,
  loadingHistory,
  pagination,
  onPageChange,
  filters,
  onRefresh,
  onOpenDrawer,
  onOpenBill,
  onCancel,
  onMarkRefunded,
  onConfirmPayment,
}: OrderHistoryPanelProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<any | null>(null);

  const handlers = { onCancel, onMarkRefunded, onConfirmPayment };
  const total = pagination.total || orderHistory.length;

  // The filters that live in the sheet, shown as chips you can remove with one tap.
  const chips = [
    {
      key: 'date',
      label: labelOf(DATE_CHOICES, filters.selectedDateFilter),
      active: filters.selectedDateFilter !== 'ALL',
      clear: () => filters.setSelectedDateFilter('ALL'),
    },
    {
      key: 'payment',
      label: labelOf(PAYMENT_CHOICES, filters.selectedPaymentFilter),
      active: filters.selectedPaymentFilter !== 'ALL',
      clear: () => filters.setSelectedPaymentFilter('ALL'),
    },
    {
      key: 'method',
      label: labelOf(METHOD_CHOICES, filters.selectedMethodFilter),
      active: filters.selectedMethodFilter !== 'ALL',
      clear: () => filters.setSelectedMethodFilter('ALL'),
    },
  ].filter((c) => c.active);

  return (
    <div className="space-y-3">
      {/* Overview: one line, closed until tapped. */}
      <MobileOverview
        summary={
          <>
            {total} orders
            {todaySalesPaise !== null && (
              <span className="text-slate-500 font-bold">
                {' '}
                · {formatCurrency(todaySalesPaise)} today
              </span>
            )}
          </>
        }
        onRefresh={onRefresh}
        refreshing={loadingHistory}
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
              Total Orders
            </span>
            <div className="text-base font-black text-slate-900">{total}</div>
          </div>
          {todaySalesPaise !== null && (
            <div className="bg-slate-50 p-2.5 rounded-xl">
              <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                Today's Sales
              </span>
              <div className="text-base font-black text-slate-900 truncate">
                {formatCurrency(todaySalesPaise)}
              </div>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500 font-semibold">
          Order numbers look like{' '}
          <span className="font-mono font-black text-brand-600">
            {business?.shortCode || 'ART'}-
            {new Date()
              .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
              .replace(/\//g, '')}
            -01
          </span>{' '}
          and start again from 01 each day. Times are in{' '}
          {(business?.timezone || 'Asia/Kolkata') === 'Asia/Kolkata'
            ? 'India (IST)'
            : business?.timezone}
          .
        </p>
      </MobileOverview>

      {/* Search, filters and status: stays at the top while the list scrolls. */}
      <StickyBar>
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="order-search-input"
              type="search"
              value={filters.orderSearchQuery}
              onChange={(e) => filters.setOrderSearchQuery(e.target.value)}
              placeholder="Search order, name, phone, table…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-base sm:text-xs font-semibold text-slate-800 outline-none focus:border-brand-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative flex items-center gap-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {chips.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-brand-600 text-white text-[9px] font-black flex items-center justify-center">
                {chips.length}
              </span>
            )}
          </button>
        </div>

        <PillRow
          options={STATUS_PILLS}
          value={filters.selectedStatusFilter}
          onChange={filters.setSelectedStatusFilter}
        />

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                aria-label={`Remove filter ${c.label}`}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-black"
              >
                {c.label}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}
      </StickyBar>

      {/* The orders. */}
      {loadingHistory ? (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Searching orders…</p>
        </div>
      ) : orderHistory.length === 0 ? (
        <div className="py-12 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">No matching orders found</h3>
          <p className="text-xs font-medium text-slate-500">Try a different search or filter.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {orderHistory.map((o) => {
            const sc = STATUS_CONFIG[o.orderStatus] || STATUS_CONFIG.COMPLETED;
            const actions = availableActions(o, handlers);
            const created = new Date(o.createdAt);
            return (
              <li key={o._id || o.orderId}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDrawer(o)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenDrawer(o)}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs px-3.5 py-3 space-y-1.5 active:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-black text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-md">
                        {o.orderId || o.orderNumber}
                      </span>
                      <span className="ml-1.5 text-[10px] text-slate-400 font-semibold">
                        {created.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ·{' '}
                        {created.toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 text-sm whitespace-nowrap">
                      {formatCurrency(o.totalAmountPaise)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-xs font-bold text-slate-700">
                      {o.customerName} · {o.tableName || 'Takeaway'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black border whitespace-nowrap shrink-0 ${sc.badgeBg} ${sc.badgeText}`}
                    >
                      ● {sc.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <StatusBadge tone={PAYMENT_BADGE_TONE[o.paymentStatus] || 'success'}>
                        {o.paymentStatus || 'PAID'}
                      </StatusBadge>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {o.paymentMethod || 'ONLINE'}
                      </span>
                      {needsRefund(o) && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {o.refundRequestedAt ? 'Refund requested' : 'Refund pending'}
                        </span>
                      )}
                      {o.paymentStatus === 'UNPAID' && o.customerMarkedPaidAt && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Customer says paid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Open bill"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenBill(o.orderId || o._id);
                        }}
                        className="p-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      {actions.length > 0 && (
                        <button
                          type="button"
                          aria-label="More actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsTarget(o);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pages. */}
      <PagerBar
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
      />

      {filtersOpen && (
        <OrderHistoryFilterSheet filters={filters} onClose={() => setFiltersOpen(false)} />
      )}

      {actionsTarget && (
        <Modal
          title={`Choose an action — ${actionsTarget.orderId || actionsTarget.orderNumber}`}
          onClose={() => setActionsTarget(null)}
        >
          <div className="space-y-2">
            {availableActions(actionsTarget, handlers).map((action) => (
              <button
                key={action.key}
                onClick={() => {
                  action.onClick();
                  setActionsTarget(null);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-black transition-colors ${ACTION_BUTTON_CLASS[action.tone]}`}
              >
                <action.icon className="w-4 h-4 shrink-0" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrderHistoryPanelMobile;
