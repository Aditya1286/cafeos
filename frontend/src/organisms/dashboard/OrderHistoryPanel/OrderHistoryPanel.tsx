import React, { useState } from 'react';
import { RefreshCw, FileText, X, Undo2, Wallet, MoreHorizontal } from 'lucide-react';
import ResponsiveDataView, { ResponsiveColumn } from '@/molecules/ResponsiveDataView';
import { STATUS_CONFIG, isOrderCancellable } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { OrderHistoryFilters } from '@/hooks/useOrderHistory';
import { StatusBadge, StatusBadgeTone } from '@/atoms/StatusBadge';
import { Modal } from '@/molecules/Modal';

interface OrderHistoryPanelProps {
  business: any;
  orderHistory: any[];
  todaySalesPaise: number;
  loadingHistory: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  filters: {
    orderSearchQuery: string; setOrderSearchQuery: (v: string) => void;
    selectedStatusFilter: string; setSelectedStatusFilter: (v: string) => void;
    selectedPaymentFilter: string; setSelectedPaymentFilter: (v: string) => void;
    selectedMethodFilter: string; setSelectedMethodFilter: (v: string) => void;
    selectedDateFilter: OrderHistoryFilters['dateFilter']; setSelectedDateFilter: (v: OrderHistoryFilters['dateFilter']) => void;
  };
  onRefresh: () => void;
  onOpenDrawer: (order: any) => void;
  onOpenBill: (orderId: string) => void;
  onCancel: (order: any) => void;
  onMarkRefunded: (order: any) => void;
  onConfirmPayment: (order: any) => void;
}

const PAYMENT_BADGE_TONE: Record<string, StatusBadgeTone> = {
  PAID: 'success',
  REFUNDED: 'violet',
  FAILED: 'danger',
  UNPAID: 'warning',
};

const ACTION_BUTTON_CLASS: Record<'amber' | 'violet' | 'rose', string> = {
  amber: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700',
  violet: 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700',
  rose: 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700',
};

/** A paid order that's been cancelled but not yet refunded needs the owner's attention. */
const needsRefund = (o: any) => o.orderStatus === 'CANCELLED' && o.paymentStatus === 'PAID';

export const OrderHistoryPanel = ({
  business, orderHistory, todaySalesPaise, loadingHistory, pagination, onPageChange, onPageSizeChange, filters, onRefresh, onOpenDrawer, onOpenBill, onCancel, onMarkRefunded, onConfirmPayment
}: OrderHistoryPanelProps) => {
  // Which order's "Actions" picker is open, if any — Confirm Payment / Mark Refunded / Cancel
  // used to be up to 3 separate buttons on every row; now they're one "Actions" button (shown
  // only when at least one applies) that opens this picker instead of crowding the row.
  const [actionsTarget, setActionsTarget] = useState<any | null>(null);

  const getAvailableActions = (o: any) => {
    const actions: { key: string; label: string; icon: typeof Wallet; tone: 'amber' | 'violet' | 'rose'; onClick: () => void }[] = [];
    if (o.paymentStatus === 'UNPAID' && o.orderStatus !== 'CANCELLED') {
      actions.push({
        key: 'confirm',
        label: o.customerMarkedPaidAt ? 'Confirm Payment (Customer says paid)' : 'Confirm Payment',
        icon: Wallet,
        tone: 'amber',
        onClick: () => onConfirmPayment(o),
      });
    }
    if (needsRefund(o)) {
      actions.push({ key: 'refund', label: 'Mark Refunded', icon: Undo2, tone: 'violet', onClick: () => onMarkRefunded(o) });
    }
    if (isOrderCancellable(o.orderStatus)) {
      actions.push({ key: 'cancel', label: 'Cancel Order', icon: X, tone: 'rose', onClick: () => onCancel(o) });
    }
    return actions;
  };
  const rows = orderHistory.map(o => ({
    ...o,
    _sc: STATUS_CONFIG[o.orderStatus] || STATUS_CONFIG.COMPLETED,
    _dateFormatted: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    _timeFormatted: new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  }));

  const columns: ResponsiveColumn<typeof rows[number]>[] = [
    {
      header: 'Order ID & Date',
      render: (o) => (
        <>
          <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl inline-block mb-1">
            {o.orderId || o.orderNumber}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">{o._dateFormatted} · {o._timeFormatted}</div>
        </>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Customer',
      render: (o) => (
        <>
          <div className="font-black text-slate-900 truncate max-w-[160px]">{o.customerName}</div>
          <div className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">{o.customerPhone}</div>
        </>
      ),
    },
    {
      header: 'Table',
      render: (o) => (
        <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-extrabold">
          {o.tableName || 'Takeaway'}
        </span>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Items Ordered',
      render: (o) => (
        <>
          <div className="text-slate-900 font-bold max-w-[220px] truncate">
            {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{o.items?.length || 0} items</span>
        </>
      ),
    },
    {
      header: 'Amount',
      render: (o) => <div className="font-black text-slate-900 text-sm">{formatCurrency(o.totalAmountPaise)}</div>,
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Payment',
      render: (o) => (
        <>
          <div className="flex flex-col items-start gap-1">
            <StatusBadge tone={PAYMENT_BADGE_TONE[o.paymentStatus] || 'success'}>
              {o.paymentStatus || 'PAID'}
            </StatusBadge>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{o.paymentMethod || 'ONLINE'}</span>
          </div>
          {o.transactionId && (
            <div className="text-[9px] font-mono text-slate-400 truncate max-w-[100px]" title={o.transactionId}>
              {o.transactionId}
            </div>
          )}
          {needsRefund(o) && (
            <div className={`mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block ${
              o.refundRequestedAt ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {o.refundRequestedAt ? 'Refund requested' : 'Refund pending'}
            </div>
          )}
          {o.paymentStatus === 'UNPAID' && o.customerMarkedPaidAt && (
            <div className="mt-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block bg-amber-50 text-amber-700 border border-amber-200">
              Customer says paid
            </div>
          )}
        </>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Status',
      render: (o) => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${o._sc.badgeBg} ${o._sc.badgeText}`}>
          ● {o._sc.label}
        </span>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Actions',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => onOpenDrawer(o)} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors shadow-xs">
            Details
          </button>
          <button onClick={() => onOpenBill(o.orderId || o._id)} className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black transition-colors flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Bill</span>
          </button>
          {getAvailableActions(o).length > 0 && (
            <button onClick={() => setActionsTarget(o)} className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-black transition-colors flex items-center gap-1">
              <MoreHorizontal className="w-3.5 h-3.5" />
              <span>Actions</span>
            </button>
          )}
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
  ];

  const renderCard = (o: typeof rows[number]) => (
    <div className="p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg inline-block whitespace-nowrap">
            {o.orderId || o.orderNumber}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">{o._dateFormatted} · {o._timeFormatted}</div>
        </div>
        <span className={`px-2 py-1 rounded-full text-[9px] font-black border whitespace-nowrap shrink-0 ${o._sc.badgeBg} ${o._sc.badgeText}`}>
          ● {o._sc.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="min-w-0">
          <div className="font-black text-slate-900 text-sm truncate">{o.customerName}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{o.customerPhone}</div>
        </div>
        <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-extrabold whitespace-nowrap shrink-0">
          {o.tableName || 'Takeaway'}
        </span>
      </div>

      <div>
        <div className="text-slate-900 font-bold text-xs truncate">
          {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">{o.items?.length || 0} items</span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <StatusBadge tone={PAYMENT_BADGE_TONE[o.paymentStatus] || 'success'}>
            {o.paymentStatus || 'PAID'}
          </StatusBadge>
          <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{o.paymentMethod || 'ONLINE'}</span>
        </div>
        <div className="font-black text-slate-900 text-sm whitespace-nowrap">
          {formatCurrency(o.totalAmountPaise)}
        </div>
      </div>

      {(needsRefund(o) || (o.paymentStatus === 'UNPAID' && o.customerMarkedPaidAt)) && (
        <div className="flex flex-wrap gap-1.5">
          {needsRefund(o) && (
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
              o.refundRequestedAt ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {o.refundRequestedAt ? 'Refund requested' : 'Refund pending'}
            </span>
          )}
          {o.paymentStatus === 'UNPAID' && o.customerMarkedPaidAt && (
            <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Customer says paid
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button onClick={() => onOpenDrawer(o)} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors shadow-xs">
          Details
        </button>
        <button onClick={() => onOpenBill(o.orderId || o._id)} className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black transition-colors flex items-center justify-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          <span>Bill</span>
        </button>
        {getAvailableActions(o).length > 0 && (
          <button onClick={() => setActionsTarget(o)} className="col-span-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-black transition-colors flex items-center justify-center gap-1">
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span>Actions</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-xl font-black text-slate-900">All Orders</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-black whitespace-nowrap">
              E-BILL READY
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Find any order, check its bill, and see what was paid.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono font-bold hidden md:inline-block">
            Shortcut: <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 shadow-2xs text-slate-700 font-black">⌘K</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 shadow-2xs text-slate-700 font-black">Ctrl+K</kbd>
          </span>

          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-orange-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Orders</span>
          <div className="text-base sm:text-2xl font-black text-slate-900">{pagination.total || orderHistory.length}</div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 hidden sm:block">All orders so far</span>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Today's Sales</span>
          <div className="text-base sm:text-2xl font-black text-emerald-600 truncate">{formatCurrency(todaySalesPaise)}</div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 hidden sm:block">Money from today's orders</span>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Order Numbers</span>
          <div className="text-base sm:text-2xl font-black text-orange-600 font-mono truncate">
            {business?.shortCode || 'ART'}-{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '')}-01
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 hidden sm:block">Starts again from 01 each day</span>
        </div>

        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Time Zone</span>
          <div className="text-base sm:text-2xl font-black text-indigo-600 truncate">
            {(business?.timezone || 'Asia/Kolkata') === 'Asia/Kolkata' ? 'India (IST)' : business?.timezone}
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 hidden sm:block">Order times are shown in this zone</span>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Order Status</label>
            <select
              value={filters.selectedStatusFilter}
              onChange={e => filters.setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PLACED">Placed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Payment Status</label>
            <select
              value={filters.selectedPaymentFilter}
              onChange={e => filters.setSelectedPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid / Pending</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Payment Method</label>
            <select
              value={filters.selectedMethodFilter}
              onChange={e => filters.setSelectedMethodFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="ONLINE">Online</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Credit/Debit Card</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Date Filter</label>
            <select
              value={filters.selectedDateFilter}
              onChange={e => filters.setSelectedDateFilter(e.target.value as OrderHistoryFilters['dateFilter'])}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="7DAYS">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loadingHistory ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Searching orders…</p>
          </div>
        ) : (
          <ResponsiveDataView
            data={rows}
            keyExtractor={(o) => o._id || o.orderId}
            columns={columns}
            renderCard={renderCard}
            search={{
              id: 'order-search-input',
              value: filters.orderSearchQuery,
              onChange: filters.setOrderSearchQuery,
              placeholder: 'Search by order no., name, phone, table or payment ID…',
            }}
            pagination={{
              page: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onPageChange,
              onPageSizeChange,
              pageSizeOptions: [10, 15, 25, 50],
            }}
            emptyState={
              <div className="p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-800">No matching orders found</h3>
                <p className="text-xs font-medium text-slate-500">Try a different search or filter.</p>
              </div>
            }
          />
        )}
      </div>

      {actionsTarget && (
        <Modal
          title={`Choose an action — ${actionsTarget.orderId || actionsTarget.orderNumber}`}
          onClose={() => setActionsTarget(null)}
        >
          <div className="space-y-2">
            {getAvailableActions(actionsTarget).map(action => (
              <button
                key={action.key}
                onClick={() => { action.onClick(); setActionsTarget(null); }}
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

export default OrderHistoryPanel;
