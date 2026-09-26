import React, { useMemo, useState } from 'react';
import { Search, X, Store, Wallet, AlertTriangle, Ban, FlaskConical } from 'lucide-react';
import { formatCurrency } from '@/utils/money';
import { AdminBusinessSummary } from '@/types';
import {
  BusinessFilter,
  BUSINESS_FILTERS,
  matchesBusinessFilter,
  BusinessSort,
  BUSINESS_SORTS,
  sortBusinesses,
} from './businessNetwork';
import { BusinessRowActions } from './BusinessNetworkParts';
import { BusinessesGridDesktop } from './BusinessesGridDesktop';
import { BusinessesListMobile } from './BusinessesListMobile';

export type { BusinessFilter } from './businessNetwork';

interface BusinessesGridPanelProps extends BusinessRowActions {
  /** Every business — drives the summary strip and per-filter counts. */
  allBusinesses: AdminBusinessSummary[];
  /** The subset matching the current search + filter (filtered by the page). */
  businesses: AdminBusinessSummary[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: BusinessFilter;
  onStatusFilterChange: (status: BusinessFilter) => void;
}

/**
 * Multi-tenant business network. Owns the shared toolbar — summary, search, filters with live
 * counts, sort — and renders both the desktop card grid and the mobile expandable list; CSS picks
 * which one is visible at the `md` breakpoint.
 */
export const BusinessesGridPanel = ({
  allBusinesses,
  businesses,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ...actions
}: BusinessesGridPanelProps) => {
  const [sort, setSort] = useState<BusinessSort>('attention');
  const sorted = useMemo(() => sortBusinesses(businesses, sort), [businesses, sort]);

  const summary = useMemo(() => {
    const overdue = allBusinesses.filter((b) => b.overdueAmountPaise > 0);
    return {
      owedPaise: allBusinesses.reduce((sum, b) => sum + (b.totalCommissionOwedPaise || 0), 0),
      overdueCount: overdue.length,
      overduePaise: overdue.reduce((sum, b) => sum + b.overdueAmountPaise, 0),
      suspendedCount: allBusinesses.filter((b) => b.status === 'SUSPENDED').length,
      demoCount: allBusinesses.filter((b) => b.isDemo).length,
    };
  }, [allBusinesses]);

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(
        BUSINESS_FILTERS.map((f) => [
          f.id,
          allBusinesses.filter((b) => matchesBusinessFilter(b, f.id)).length,
        ]),
      ) as Record<BusinessFilter, number>,
    [allBusinesses],
  );

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'ALL';

  const stats = [
    {
      label: 'Total owed',
      value: formatCurrency(summary.owedPaise),
      icon: Wallet,
      tone: 'text-slate-900',
      bg: 'bg-white border-slate-200',
    },
    {
      label: 'Overdue',
      value:
        summary.overdueCount > 0
          ? `${summary.overdueCount} · ${formatCurrency(summary.overduePaise)}`
          : 'None',
      icon: AlertTriangle,
      tone: summary.overdueCount > 0 ? 'text-amber-700' : 'text-slate-900',
      bg: summary.overdueCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
    },
    {
      label: 'Suspended',
      value: String(summary.suspendedCount),
      icon: Ban,
      tone: summary.suspendedCount > 0 ? 'text-rose-700' : 'text-slate-900',
      bg: 'bg-white border-slate-200',
    },
    {
      label: 'Demo',
      value: String(summary.demoCount),
      icon: FlaskConical,
      tone: 'text-slate-900',
      bg: 'bg-white border-slate-200',
    },
  ];

  return (
    <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
      <div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-red-500 shrink-0" />
          <span>Businesses</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-mono">
            {allBusinesses.length}
          </span>
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Every business on the platform — what it owes, its plan, and quick actions.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`p-3 rounded-2xl border min-w-0 ${s.bg}`}>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400">
              <s.icon className="w-3 h-3 shrink-0" />
              <span className="truncate">{s.label}</span>
            </div>
            <div className={`text-sm sm:text-base font-black truncate ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search name, menu link, or email…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-200 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as BusinessSort)}
            aria-label="Sort businesses"
            className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-red-400"
          >
            {BUSINESS_SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scrolls sideways on narrow phones instead of wrapping onto a second row. */}
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]">
          {BUSINESS_FILTERS.map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onStatusFilterChange(f.id)}
                aria-pressed={active}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] font-mono ${active ? 'text-white/70' : 'text-slate-400'}`}
                >
                  {filterCounts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
          <Store className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">
            {allBusinesses.length === 0
              ? 'No businesses registered yet.'
              : 'No businesses match these filters.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                onSearchChange('');
                onStatusFilterChange('ALL');
              }}
              className="text-xs font-extrabold text-red-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="md:hidden">
            <BusinessesListMobile businesses={sorted} {...actions} />
          </div>
          <div className="hidden md:block">
            <BusinessesGridDesktop businesses={sorted} {...actions} />
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessesGridPanel;
