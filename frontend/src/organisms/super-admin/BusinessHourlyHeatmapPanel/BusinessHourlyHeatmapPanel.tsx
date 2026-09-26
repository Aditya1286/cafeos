import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame, Search, X } from 'lucide-react';
import { AdminBusinessSummary, BusinessHeatmapCell } from '@/types';
import { useBusinessHourlyHeatmap } from '@/hooks/useBusinessHourlyHeatmap';
import { useTopBusinessesByRevenue } from '@/hooks/useTopBusinessesByRevenue';
import { useBusinessInsights } from '@/hooks/useBusinessInsights';
import { formatHeatmapHour } from '@/utils/adminInsights';
import { RepeatCustomerBar } from '@/molecules/RepeatCustomerBar';
import { ItemMarginTable } from '@/molecules/ItemMarginTable';
import { KitchenSpeedPanel } from '@/molecules/KitchenSpeedPanel';

import { DAY_LABELS } from './heatmapShared';
import { HeatmapGridDesktop } from './HeatmapGridDesktop';
import { HeatmapGridMobile } from './HeatmapGridMobile';

const SEARCH_RESULTS_LIMIT = 8;
const TOP_N = 8;

interface BusinessHourlyHeatmapPanelProps {
  /** Every registered business (already loaded by the dashboard) — searched by name or email so
   * you're not limited to picking from the top-N-by-revenue dropdown below. */
  businesses: AdminBusinessSummary[];
}

export const BusinessHourlyHeatmapPanel = ({ businesses }: BusinessHourlyHeatmapPanelProps) => {
  // Ranked by actual paid-order revenue in the last 90 days, not `lifetimeGMVPaise`
  // (remittance-cycle based — can be 0 for an active business whose first billing
  // period hasn't closed yet, which would make "top N" meaningless).
  const { businesses: topBusinesses, loading: loadingBusinesses } =
    useTopBusinessesByRevenue(TOP_N);

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [selectedBusinessName, setSelectedBusinessName] = useState<string>('');

  useEffect(() => {
    if (!selectedBusinessId && topBusinesses.length > 0) {
      setSelectedBusinessId(topBusinesses[0]._id);
      setSelectedBusinessName(topBusinesses[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topBusinesses.length]);

  const { heatmap, loading } = useBusinessHourlyHeatmap(selectedBusinessId || null);
  const { insights, loading: loadingInsights } = useBusinessInsights(selectedBusinessId || null);

  // Search-by-name-or-email, independent of the top-N dropdown — so a business that isn't a
  // current top performer can still be pulled up directly.
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return [];
    return businesses
      .filter((b) => b.name.toLowerCase().includes(term) || b.email.toLowerCase().includes(term))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }, [businesses, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSearchResult = (business: AdminBusinessSummary) => {
    setSelectedBusinessId(business._id);
    setSelectedBusinessName(business.name);
    setSearchQuery('');
    setShowResults(false);
  };

  const cellByKey = new Map((heatmap?.cells || []).map((c) => [`${c.day}-${c.hour}`, c]));
  const maxRevenuePaise = Math.max(1, ...(heatmap?.cells || []).map((c) => c.revenuePaise));
  const totalRevenuePaise = (heatmap?.cells || []).reduce((sum, c) => sum + c.revenuePaise, 0);
  const totalOrders = (heatmap?.cells || []).reduce((sum, c) => sum + c.orders, 0);
  const busiestCell = (heatmap?.cells || []).reduce<BusinessHeatmapCell | null>(
    (best, cur) => (!best || cur.revenuePaise > best.revenuePaise ? cur : best),
    null,
  );

  // The <select> below only lists the top-N-by-revenue businesses — if the current selection
  // came from search instead, inject it as an extra option so the dropdown never shows a value
  // that doesn't match any of its own <option>s.
  const selectedInTopBusinesses = topBusinesses.some((b) => b._id === selectedBusinessId);

  return (
    <div className="lg:col-span-12 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Busiest Hours for a Business</h3>
          <p className="text-xs text-slate-500 font-medium">
            Sales by day and hour over the last 90 days. Pick a business to see its busy times.
          </p>
          {selectedBusinessName && (
            <p className="text-xs font-bold text-red-600 mt-1">Showing: {selectedBusinessName}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
          {/* Search by name or email — not limited to the top-N-by-revenue dropdown */}
          <div ref={searchBoxRef} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search business by name or email…"
              className="pl-8 pr-7 py-2 w-full sm:w-64 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowResults(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {showResults && searchQuery.trim() !== '' && (
              <div className="absolute z-20 top-full mt-1.5 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-3.5 py-3 text-xs text-slate-400 font-medium">
                    No business matches "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((b) => (
                    <button
                      key={b._id}
                      onClick={() => handleSelectSearchResult(b)}
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

          {topBusinesses.length > 0 && (
            <select
              value={selectedInTopBusinesses ? selectedBusinessId : ''}
              onChange={(e) => {
                const business = topBusinesses.find((b) => b._id === e.target.value);
                setSelectedBusinessId(e.target.value);
                setSelectedBusinessName(business?.name || '');
              }}
              className="w-full sm:w-auto sm:max-w-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              {!selectedInTopBusinesses && (
                <option value="" disabled>
                  Top businesses by sales…
                </option>
              )}
              {topBusinesses.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} · ₹{Math.round((b.revenuePaise || 0) / 100).toLocaleString('en-IN')}{' '}
                  (90d)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loadingBusinesses ? (
        <p className="text-xs text-slate-400 font-medium py-6 text-center">Loading businesses…</p>
      ) : topBusinesses.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium py-6 text-center">
          No paid orders in the last 90 days for any business.
        </p>
      ) : loading ? (
        <p className="text-xs text-slate-400 font-medium py-6 text-center">Loading…</p>
      ) : (
        <>
          <div className="md:hidden">
            <HeatmapGridMobile cellByKey={cellByKey} maxRevenuePaise={maxRevenuePaise} />
          </div>
          <div className="hidden md:block">
            <HeatmapGridDesktop cellByKey={cellByKey} maxRevenuePaise={maxRevenuePaise} />
          </div>

          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-[11px] sm:text-xs font-bold text-red-800 flex items-start sm:items-center gap-2">
            <Flame className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              {busiestCell
                ? `🔥 Busiest slot (last 90 days): ${DAY_LABELS[busiestCell.day - 1]} ${formatHeatmapHour(busiestCell.hour)} — ₹${Math.round(busiestCell.revenuePaise / 100).toLocaleString('en-IN')} from ${busiestCell.orders} orders. Total in window: ₹${Math.round(totalRevenuePaise / 100).toLocaleString('en-IN')} across ${totalOrders} orders.`
                : 'No paid orders in the last 90 days for this business.'}
            </span>
          </div>

          {/* Same three insights a business sees about itself, looked up here for whichever
              business is currently selected via the search box above. */}
          <div className="pt-2 border-t border-slate-100 space-y-5">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Details — {selectedBusinessName}
            </h4>

            {loadingInsights || !insights ? (
              <p className="text-xs text-slate-400 font-medium py-4 text-center">
                {loadingInsights ? 'Loading insights…' : 'No insights available yet.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-black text-slate-900">Returning Customers</h5>
                  <RepeatCustomerBar stats={insights.repeatCustomers} />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-black text-slate-900">How Fast Orders Are Ready</h5>
                  <KitchenSpeedPanel stats={insights.kitchenSpeed} />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 lg:col-span-2">
                  <h5 className="text-xs font-black text-slate-900">Profit per Item</h5>
                  <ItemMarginTable data={insights.itemMargins} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BusinessHourlyHeatmapPanel;
