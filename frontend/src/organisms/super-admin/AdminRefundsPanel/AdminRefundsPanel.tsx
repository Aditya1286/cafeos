import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, FileText, Ban, AlertTriangle, IndianRupee, Clock, Search, X } from 'lucide-react';
import ResponsiveDataView, { ResponsiveColumn } from '../../ui/ResponsiveDataView';
import { STATUS_CONFIG } from '../../../constants/orderStatus';
import { formatCurrency } from '../../../utils/money';
import { AdminBusinessSummary, AdminRefundInsights } from '../../../types';

const SEARCH_RESULTS_LIMIT = 8;

interface AdminRefundsPanelProps {
  businesses: AdminBusinessSummary[];
  orders: any[];
  loading: boolean;
  insights: AdminRefundInsights | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (v: string) => void;
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void;
  onRefresh: () => void;
  onViewHistory: (order: any) => void;
}

const needsRefund = (o: any) => o.orderStatus === 'CANCELLED' && o.paymentStatus === 'PAID';

const InsightCard = ({ icon: Icon, label, value, subtext, color, iconBg }: { icon: any; label: string; value: string | number; subtext: string; color: string; iconBg: string }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">{label}</span>
      <div className={`w-7 h-7 rounded-lg ${iconBg} text-white flex items-center justify-center shrink-0`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
    </div>
    <div className={`text-xl font-black ${color}`}>{value}</div>
    <div className="text-[10px] font-semibold text-slate-400">{subtext}</div>
  </div>
);

export const AdminRefundsPanel = ({
  businesses, orders, loading, insights, pagination, onPageChange, onPageSizeChange,
  searchQuery, onSearchChange, paymentStatusFilter, onPaymentStatusFilterChange,
  selectedBusinessId, onSelectBusiness, onRefresh, onViewHistory
}: AdminRefundsPanelProps) => {
  // Search-by-name-or-email business picker — same pattern as BusinessHourlyHeatmapPanel.
  const [businessQuery, setBusinessQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const selectedBusiness = businesses.find((b) => b._id === selectedBusinessId) || null;

  const searchResults = useMemo(() => {
    const term = businessQuery.trim().toLowerCase();
    if (!term) return [];
    return businesses
      .filter((b) => b.name.toLowerCase().includes(term) || b.email.toLowerCase().includes(term))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }, [businesses, businessQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBusiness = (business: AdminBusinessSummary) => {
    onSelectBusiness(business._id);
    setBusinessQuery('');
    setShowResults(false);
  };

  const rows = orders.map(o => ({
    ...o,
    _sc: STATUS_CONFIG[o.orderStatus] || STATUS_CONFIG.CANCELLED,
    _dateFormatted: new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    _businessName: typeof o.businessId === 'object' ? o.businessId?.name : null,
  }));

  const columns: ResponsiveColumn<typeof rows[number]>[] = [
    {
      header: 'Order',
      render: (o) => (
        <>
          <div className="font-mono text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl inline-block mb-1">
            {o.orderId || o.orderNumber}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">{o._dateFormatted}</div>
        </>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    ...(!selectedBusinessId ? [{
      header: 'Business',
      render: (o: typeof rows[number]) => (
        <div className="font-black text-slate-900 truncate max-w-[160px]">{o._businessName || '—'}</div>
      ),
    } as ResponsiveColumn<typeof rows[number]>] : []),
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
      render: (o) => <div className="font-black text-slate-900 text-sm">{formatCurrency(o.totalAmountPaise)}</div>,
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
    {
      header: 'Status',
      render: (o) => (
        <div className="space-y-1">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border inline-block ${o._sc.badgeBg} ${o._sc.badgeText}`}>
            ● {o._sc.label}
          </span>
          {needsRefund(o) && (
            <div className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full inline-block ${
              o.refundRequestedAt ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
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
      render: (o) => (
        o.refundReason
          ? <span className="text-slate-600 italic text-[11px] max-w-[200px] block truncate" title={o.refundReason}>"{o.refundReason}"</span>
          : <span className="text-slate-300 text-[11px]">—</span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (o) => (
        <button onClick={() => onViewHistory(o)} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center gap-1 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      ),
      headerClassName: 'whitespace-nowrap',
      cellClassName: 'whitespace-nowrap',
    },
  ];

  const renderCard = (o: typeof rows[number]) => (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl whitespace-nowrap">
          {o.orderId || o.orderNumber}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap shrink-0 ${o._sc.badgeBg} ${o._sc.badgeText}`}>
          ● {o._sc.label}
        </span>
      </div>
      <div className="text-[11px] text-slate-400 font-medium">
        {o._dateFormatted}{o._businessName ? ` · ${o._businessName}` : ''}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-black text-slate-900 truncate">{o.customerName}</div>
          <div className="text-[11px] text-slate-400 font-semibold">{o.customerPhone}</div>
        </div>
        <div className="font-black text-slate-900 text-sm whitespace-nowrap">{formatCurrency(o.totalAmountPaise)}</div>
      </div>
      {o.refundReason && (
        <div className="text-[11px] text-slate-600 italic bg-slate-50 border border-slate-200 rounded-xl p-2">"{o.refundReason}"</div>
      )}
      <button onClick={() => onViewHistory(o)} className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors flex items-center gap-1 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5" />
        <span>History</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900">Refunds & Cancellations</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Platform-wide, or narrowed to one business — what got cancelled, what's still owed, and what the customer said.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <div ref={searchBoxRef} className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={businessQuery}
            onChange={(e) => { setBusinessQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search business by name or email…"
            className="pl-8 pr-7 py-2 w-full rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
          />
          {businessQuery && (
            <button
              onClick={() => { setBusinessQuery(''); setShowResults(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {showResults && businessQuery.trim() !== '' && (
            <div className="absolute z-20 top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-slate-400 font-medium">No business matches "{businessQuery}"</div>
              ) : (
                searchResults.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => handleSelectBusiness(b)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <div className="text-xs font-extrabold text-slate-900">{b.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{b.email}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selectedBusiness ? (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 whitespace-nowrap">
            <span>Showing: {selectedBusiness.name}</span>
            <button onClick={() => onSelectBusiness('')} className="p-0.5 rounded-md hover:bg-red-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Showing all businesses</span>
        )}
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
              label="Avg. Refund Turnaround"
              value={insights.avgRefundTurnaroundHours !== null ? `${insights.avgRefundTurnaroundHours}h` : '—'}
              subtext="Request → confirmed"
              color="text-slate-900"
              iconBg="bg-slate-700"
            />
          </div>

          {insights.paymentMethodBreakdown.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-2">Refunds by Payment Method</span>
              <div className="flex flex-wrap gap-3">
                {insights.paymentMethodBreakdown.map((pm) => (
                  <div key={pm._id} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-black text-slate-900">{pm._id}</span>
                    <span className="text-slate-500 font-semibold"> · {pm.count} orders · {formatCurrency(pm.amountPaise)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedBusinessId && insights.byBusiness.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Top Businesses by Refund Volume</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400">
                      <th className="text-left px-4 py-2.5">Business</th>
                      <th className="text-right px-4 py-2.5">Cancellations</th>
                      <th className="text-right px-4 py-2.5">Needs Refund</th>
                      <th className="text-right px-4 py-2.5">Refunded</th>
                      <th className="text-right px-4 py-2.5">Refunded Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.byBusiness.map((b) => (
                      <tr
                        key={b.businessId}
                        onClick={() => onSelectBusiness(b.businessId)}
                        className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 font-black text-slate-900">{b.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{b.cancellations}</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          <span className={b.needsRefundCount > 0 ? 'text-amber-600' : 'text-slate-400'}>{b.needsRefundCount}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{b.refundedCount}</td>
                        <td className="px-4 py-2.5 text-right font-black text-violet-600">{formatCurrency(b.refundedAmountPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <label className="text-[10px] font-extrabold uppercase text-slate-400 mb-1 block">Payment Status</label>
        <select
          value={paymentStatusFilter}
          onChange={e => onPaymentStatusFilterChange(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-red-500"
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
            <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" />
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
                <h3 className="text-base font-black text-slate-800">No cancellations or refunds found</h3>
                <p className="text-xs font-medium text-slate-500">Try adjusting your search or filter.</p>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
};

export default AdminRefundsPanel;
