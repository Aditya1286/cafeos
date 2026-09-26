import React from 'react';
import { RefreshCw, FileText, Undo2, AlertTriangle, Clock, Ban, IndianRupee } from 'lucide-react';
import ResponsiveDataView, { ResponsiveColumn } from '@/molecules/ResponsiveDataView';
import { STATUS_CONFIG } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { RefundInsights } from '@/types';

interface RefundsPanelProps {
  orders: any[];
  loading: boolean;
  insights: RefundInsights | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (v: string) => void;
  onRefresh: () => void;
  onViewHistory: (order: any) => void;
  onMarkRefunded: (order: any) => void;
}

const needsRefund = (o: any) => o.orderStatus === 'CANCELLED' && o.paymentStatus === 'PAID';

const InsightCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  iconBg,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
  iconBg: string;
}) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
        {label}
      </span>
      <div
        className={`w-7 h-7 rounded-lg ${iconBg} text-white flex items-center justify-center shrink-0`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <div className={`text-xl font-black ${color}`}>{value}</div>
    <div className="text-[10px] font-semibold text-slate-400">{subtext}</div>
  </div>
);

export const RefundsPanel = ({
  orders,
  loading,
  insights,
  pagination,
  onPageChange,
  onPageSizeChange,
  searchQuery,
  onSearchChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  onRefresh,
  onViewHistory,
  onMarkRefunded,
}: RefundsPanelProps) => {
  const rows = orders.map((o) => ({
    ...o,
    _sc: STATUS_CONFIG[o.orderStatus] || STATUS_CONFIG.CANCELLED,
    _dateFormatted: new Date(o.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }));

  const columns: ResponsiveColumn<(typeof rows)[number]>[] = [
    {
      header: 'Order',
      render: (o) => (
        <>
          <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl inline-block mb-1">
            {o.orderId || o.orderNumber}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">{o._dateFormatted}</div>
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
          <div className="text-[11px] text-slate-400 font-semibold">{o.customerPhone}</div>
        </>
      ),
    },
    {
      header: 'Amount',
      render: (o) => (
        <div className="font-black text-slate-900 text-sm">
          {formatCurrency(o.totalAmountPaise)}
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Status',
      render: (o) => (
        <div className="space-y-1">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black border inline-block ${o._sc.badgeBg} ${o._sc.badgeText}`}
          >
            ● {o._sc.label}
          </span>
          {needsRefund(o) && (
            <div
              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block ${
                o.refundRequestedAt
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {o.refundRequestedAt ? 'Refund requested' : 'Needs refund'}
            </div>
          )}
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: "Customer's Note",
      render: (o) =>
        o.refundReason ? (
          <span
            className="text-slate-600 italic text-[11px] max-w-[200px] block truncate"
            title={o.refundReason}
          >
            "{o.refundReason}"
          </span>
        ) : (
          <span className="text-slate-300 text-[11px]">—</span>
        ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (o) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onViewHistory(o)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          {needsRefund(o) && (
            <button
              onClick={() => onMarkRefunded(o)}
              className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-black transition-colors flex items-center gap-1"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Mark Refunded</span>
            </button>
          )}
        </div>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
  ];

  const renderCard = (o: (typeof rows)[number]) => (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl whitespace-nowrap">
          {o.orderId || o.orderNumber}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap shrink-0 ${o._sc.badgeBg} ${o._sc.badgeText}`}
        >
          ● {o._sc.label}
        </span>
      </div>
      <div className="text-[11px] text-slate-400 font-medium">{o._dateFormatted}</div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-slate-900 truncate">{o.customerName}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{o.customerPhone}</div>
        </div>
        <div className="font-black text-slate-900 text-sm whitespace-nowrap">
          {formatCurrency(o.totalAmountPaise)}
        </div>
      </div>
      {o.refundReason && (
        <div className="text-[11px] text-slate-600 italic bg-slate-50 border border-slate-200 rounded-xl p-2">
          "{o.refundReason}"
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => onViewHistory(o)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
        {needsRefund(o) && (
          <button
            onClick={() => onMarkRefunded(o)}
            className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-xs font-black transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Mark Refunded</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900">Refunds & Cancellations</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Every cancelled order, what the customer said, and who gave the refund.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {insights && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InsightCard
              icon={Ban}
              label="Total Cancellations"
              value={insights.totalCancellations}
              subtext={`${insights.unpaidCancellationsCount} never paid`}
              color="text-slate-900"
              iconBg="bg-slate-700"
            />
            <InsightCard
              icon={AlertTriangle}
              label="Needs Refund Now"
              value={insights.needsRefundCount}
              subtext={`${insights.refundRequestedCount} requested by customer`}
              color={insights.needsRefundCount > 0 ? 'text-amber-600' : 'text-emerald-600'}
              iconBg={insights.needsRefundCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
            />
            <InsightCard
              icon={IndianRupee}
              label="Total Refunded"
              value={formatCurrency(insights.totalRefundedAmountPaise)}
              subtext={`${insights.totalRefundedCount} orders`}
              color="text-violet-600"
              iconBg="bg-violet-500"
            />
            <InsightCard
              icon={Clock}
              label="Avg. Time to Refund"
              value={
                insights.avgRefundTurnaroundHours !== null
                  ? `${insights.avgRefundTurnaroundHours}h`
                  : '—'
              }
              subtext="Request → confirmed"
              color="text-slate-900"
              iconBg="bg-slate-700"
            />
          </div>

          {insights.paymentMethodBreakdown.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2">
                Refunds by Payment Method
              </span>
              <div className="flex flex-wrap gap-3">
                {insights.paymentMethodBreakdown.map((pm) => (
                  <div
                    key={pm._id}
                    className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <span className="font-black text-slate-900">{pm._id}</span>
                    <span className="text-slate-500 font-semibold">
                      {' '}
                      · {pm.count} orders · {formatCurrency(pm.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">
          Payment Status
        </label>
        <select
          value={paymentStatusFilter}
          onChange={(e) => onPaymentStatusFilterChange(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
        >
          <option value="ALL">All Payment Statuses</option>
          <option value="PAID">Paid (needs refund)</option>
          <option value="REFUNDED">Refunded</option>
          <option value="UNPAID">Never paid</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading refunds & cancellations...</p>
          </div>
        ) : (
          <ResponsiveDataView
            data={rows}
            keyExtractor={(o) => o._id || o.orderId}
            columns={columns}
            renderCard={renderCard}
            search={{
              value: searchQuery,
              onChange: onSearchChange,
              placeholder: 'Search by Order ID, Customer Name, or Phone...',
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
                <h3 className="text-base font-black text-slate-800">
                  No cancellations or refunds found
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Try adjusting your search or filter.
                </p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
};

export default RefundsPanel;
