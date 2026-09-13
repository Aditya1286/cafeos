import React from 'react';
import { RefreshCw, Search, X, FileText } from 'lucide-react';
import ResponsiveDataView, { ResponsiveColumn } from '../../ui/ResponsiveDataView';
import { STATUS_CONFIG, isOrderCancellable } from '../../../constants/orderStatus';
import { formatCurrency } from '../../../utils/money';
import { OrderHistoryFilters } from '../../../hooks/useOrderHistory';

interface OrderHistoryPanelProps {
  business: any;
  orderHistory: any[];
  todaySalesPaise: number;
  loadingHistory: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
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
}

export const OrderHistoryPanel = ({
  business, orderHistory, todaySalesPaise, loadingHistory, pagination, onPageChange, filters, onRefresh, onOpenDrawer, onOpenBill, onCancel
}: OrderHistoryPanelProps) => {
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
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
              o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {o.paymentStatus || 'PAID'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{o.paymentMethod || 'ONLINE'}</span>
          </div>
          {o.transactionId && (
            <div className="text-[9px] font-mono text-slate-400 truncate max-w-[100px]" title={o.transactionId}>
              {o.transactionId}
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
            <span>E-Bill</span>
          </button>
          {isOrderCancellable(o.orderStatus) && (
            <button onClick={() => onCancel(o)} className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black transition-colors flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
  ];

  const renderCard = (o: typeof rows[number]) => (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl whitespace-nowrap">
          {o.orderId || o.orderNumber}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap shrink-0 ${o._sc.badgeBg} ${o._sc.badgeText}`}>
          ● {o._sc.label}
        </span>
      </div>

      <div className="text-[11px] text-slate-400 font-medium">{o._dateFormatted} · {o._timeFormatted}</div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-slate-900 truncate">{o.customerName}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{o.customerPhone}</div>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-extrabold whitespace-nowrap shrink-0">
          {o.tableName || 'Takeaway'}
        </span>
      </div>

      <div>
        <div className="text-slate-900 font-bold text-xs">
          {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">{o.items?.length || 0} items</span>
      </div>

      <div className="flex items-end justify-between gap-3 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
            o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {o.paymentStatus || 'PAID'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{o.paymentMethod || 'ONLINE'}</span>
        </div>
        <div className="font-black text-slate-900 text-sm pt-2 whitespace-nowrap">
          {formatCurrency(o.totalAmountPaise)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button onClick={() => onOpenDrawer(o)} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors shadow-xs whitespace-nowrap">
          Details
        </button>
        <button onClick={() => onOpenBill(o.orderId || o._id)} className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black transition-colors flex items-center gap-1 whitespace-nowrap">
          <FileText className="w-3.5 h-3.5" />
          <span>E-Bill</span>
        </button>
        {isOrderCancellable(o.orderStatus) && (
          <button onClick={() => onCancel(o)} className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-black transition-colors flex items-center gap-1 whitespace-nowrap">
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">Order Intelligence & History</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-black">
              E-BILL READY
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Search, review, inspect bills, and audit every business transaction by unique daily order sequence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono font-bold hidden md:inline-block">
            Shortcut: <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 shadow-2xs text-slate-700 font-black">⌘K</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-300 shadow-2xs text-slate-700 font-black">Ctrl+K</kbd>
          </span>

          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin text-orange-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Orders</span>
          <div className="text-2xl font-black text-slate-900">{pagination.total || orderHistory.length}</div>
          <span className="text-[10px] font-semibold text-slate-400">Total recorded transactions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Today's Revenue</span>
          <div className="text-2xl font-black text-emerald-600">{formatCurrency(todaySalesPaise)}</div>
          <span className="text-[10px] font-semibold text-emerald-600">Business day total, all filters</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Daily Sequence Prefix</span>
          <div className="text-2xl font-black text-orange-600 font-mono">
            {business?.shortCode || 'ART'}-DDMMYY
          </div>
          <span className="text-[10px] font-semibold text-slate-400">Auto-resets every midnight</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Timezone Scope</span>
          <div className="text-2xl font-black text-indigo-600 truncate">
            {business?.timezone || 'Asia/Kolkata'}
          </div>
          <span className="text-[10px] font-semibold text-slate-400">Concurrency-safe MongoDB sequence</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="order-search-input"
            type="text"
            placeholder="Search by Order ID (e.g. ART-120926-0001), Customer Name, Phone, Table 04, or Transaction ID..."
            value={filters.orderSearchQuery}
            onChange={e => filters.setOrderSearchQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all shadow-inner"
          />
          {filters.orderSearchQuery && (
            <button
              onClick={() => filters.setOrderSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
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
            <p className="text-xs font-bold text-slate-500">Searching orders database...</p>
          </div>
        ) : orderHistory.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-black text-slate-800">No matching orders found</h3>
            <p className="text-xs font-medium text-slate-500">Try adjusting your search query or filter options.</p>
          </div>
        ) : (
          <ResponsiveDataView
            data={rows}
            keyExtractor={(o) => o._id || o.orderId}
            columns={columns}
            renderCard={renderCard}
          />
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total orders)
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => onPageChange(pagination.page - 1)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => onPageChange(pagination.page + 1)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPanel;
