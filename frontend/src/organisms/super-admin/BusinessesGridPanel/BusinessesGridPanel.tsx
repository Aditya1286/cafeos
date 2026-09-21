import React from 'react';
import { Search, AlertTriangle, Wallet } from 'lucide-react';
import { formatCurrency } from '../../../utils/money';
import { AdminBusinessSummary } from '../../../types';

interface BusinessesGridPanelProps {
  businesses: AdminBusinessSummary[];
  totalCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | 'ACTIVE' | 'SUSPENDED';
  onStatusFilterChange: (status: 'ALL' | 'ACTIVE' | 'SUSPENDED') => void;
  onOpenFinance: (businessId: string) => void;
  onOpenStatusModal: (business: { id: string; name: string; status: string }) => void;
}

export const BusinessesGridPanel = ({
  businesses, totalCount, searchQuery, onSearchChange, statusFilter, onStatusFilterChange, onOpenFinance, onOpenStatusModal
}: BusinessesGridPanelProps) => (
  <div className="space-y-6">
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900">
            Multi-Tenant Business Network ({totalCount})
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            All registered outlet businesses, subscription statuses, and commission owed
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 text-xs font-bold">
            {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => onStatusFilterChange(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search business..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {businesses.map((r) => (
          <div
            key={r._id}
            className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 hover:border-red-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {r.name.charAt(0)}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                  r.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {r.status}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {r.name}
                </h4>
                <div className="text-xs font-mono text-red-600 font-bold mt-0.5">
                  /c/{r.slug}
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 font-medium">
                <div>📧 {r.email}</div>
                <div>📞 {r.phone}</div>
                <div className="text-[11px] text-slate-400 truncate">{r.address}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Commission</div>
                  <div className="text-xs font-black text-slate-700">{r.commissionRatePercentage ?? 3}% · {formatCurrency(r.totalCommissionOwedPaise)} owed</div>
                </div>
                {r.overdueAmountPaise > 0 ? (
                  <span className="px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overdue
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold">
                    Current
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenFinance(r._id)}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" /> View Finances
                </button>
                <button
                  onClick={() => onOpenStatusModal({ id: r._id, name: r.name, status: r.status })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
                    r.status === 'ACTIVE'
                      ? 'bg-slate-200 text-slate-800 hover:bg-rose-100 hover:text-rose-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {r.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default BusinessesGridPanel;
