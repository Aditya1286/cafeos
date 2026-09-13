import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ShieldAlert, AlertTriangle, CheckCircle2, Radar } from 'lucide-react';
import { AdminBusinessSummary } from '../../../types';
import { formatCurrency } from '../../../utils/money';

const SEARCH_RESULTS_LIMIT = 8;

interface BusinessConstellationProps {
  businesses: AdminBusinessSummary[];
  onSelectBusiness: (business: AdminBusinessSummary) => void;
}

type Health = 'suspended' | 'overdue' | 'healthy';

const healthOf = (b: AdminBusinessSummary): Health =>
  b.status === 'SUSPENDED' ? 'suspended' : b.overdueAmountPaise > 0 ? 'overdue' : 'healthy';

// Fixed status colors (never brand hue, never magnitude) — same convention the
// rest of the dashboard's semantic badges already use.
const HEALTH_STYLE: Record<Health, { cell: string; ring: string; dot: string }> = {
  suspended: { cell: 'bg-slate-100 text-slate-500 border border-slate-300', ring: 'ring-slate-300', dot: 'bg-slate-400' },
  overdue: { cell: 'bg-amber-50 text-amber-700 border border-amber-300', ring: 'ring-amber-300', dot: 'bg-amber-500' },
  healthy: { cell: 'bg-emerald-50 text-emerald-700 border border-emerald-200', ring: 'ring-emerald-300', dot: 'bg-emerald-500' },
};

/**
 * Every registered business at a glance, sorted so the ones that actually need
 * the ops team's attention (suspended, then overdue — worst first) surface
 * before the long tail of healthy accounts, rather than a wall of identical
 * detail cards that becomes unusable past a few dozen entries. Color encodes
 * real account health, not a vanity metric — search by name/email (same
 * pattern as BusinessHourlyHeatmapPanel) to jump straight to one.
 */
export const BusinessConstellation = ({ businesses, onSelectBusiness }: BusinessConstellationProps) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const term = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!term) return [];
    return businesses
      .filter((b) => b.name.toLowerCase().includes(term) || b.email.toLowerCase().includes(term))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }, [businesses, term]);

  const { sorted, suspendedCount, overdueBusinesses, overdueTotalPaise } = useMemo(() => {
    const overdue = businesses.filter((b) => healthOf(b) === 'overdue');
    const suspended = businesses.filter((b) => healthOf(b) === 'suspended').length;
    const overdueTotal = overdue.reduce((acc, b) => acc + b.overdueAmountPaise, 0);

    const rank: Record<Health, number> = { suspended: 0, overdue: 1, healthy: 2 };
    const sortedList = [...businesses].sort((a, b) => {
      const healthDiff = rank[healthOf(a)] - rank[healthOf(b)];
      if (healthDiff !== 0) return healthDiff;
      return b.overdueAmountPaise - a.overdueAmountPaise || b.lifetimeGMVPaise - a.lifetimeGMVPaise;
    });

    return { sorted: sortedList, suspendedCount: suspended, overdueBusinesses: overdue, overdueTotalPaise: overdueTotal };
  }, [businesses]);

  const needsAttentionCount = suspendedCount + overdueBusinesses.length;

  const handleSelect = (business: AdminBusinessSummary) => {
    onSelectBusiness(business);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Radar className="w-4 h-4 text-red-500" /> Business Radar
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-md">
            Every business at a glance, worst-first — suspended and overdue accounts surface
            before the healthy long tail. Click one, or search, to see it in full.
          </p>
        </div>

        <div ref={boxRef} className="relative shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search business by name or email…"
            className="pl-8 pr-7 py-2 w-64 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setShowResults(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {showResults && term !== '' && (
            <div className="absolute z-20 top-full mt-1.5 right-0 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-slate-400 font-medium">No business matches "{query}"</div>
              ) : (
                searchResults.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => handleSelect(b)}
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
      </div>

      {/* Real, computed insights — not decoration */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-4 rounded-2xl border ${needsAttentionCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`text-[10px] font-bold uppercase flex items-center gap-1 ${needsAttentionCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            <AlertTriangle className="w-3 h-3" /> Needs Attention
          </div>
          <div className={`text-lg font-black ${needsAttentionCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{needsAttentionCount}</div>
        </div>
        <div className={`p-4 rounded-2xl border ${overdueBusinesses.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`text-[10px] font-bold uppercase flex items-center gap-1 ${overdueBusinesses.length > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
            <ShieldAlert className="w-3 h-3" /> Overdue Commission
          </div>
          <div className={`text-lg font-black ${overdueBusinesses.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {overdueBusinesses.length > 0 ? `${formatCurrency(overdueTotalPaise)} · ${overdueBusinesses.length}` : '₹0'}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <div className="text-[10px] text-emerald-600 font-bold uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Healthy
          </div>
          <div className="text-lg font-black text-emerald-700">{businesses.length - needsAttentionCount} / {businesses.length}</div>
        </div>
      </div>

      {businesses.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium text-center py-8">No businesses registered yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sorted.map((b) => {
            const health = healthOf(b);
            const style = HEALTH_STYLE[health];
            const isMatch = term !== '' && (b.name.toLowerCase().includes(term) || b.email.toLowerCase().includes(term));
            const isDimmed = term !== '' && !isMatch;

            return (
              <motion.button
                key={b._id}
                type="button"
                onClick={() => handleSelect(b)}
                onMouseEnter={() => setHoveredId(b._id)}
                onMouseLeave={() => setHoveredId(null)}
                animate={{ opacity: isDimmed ? 0.25 : 1 }}
                whileHover={{ scale: 1.15 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] transition-colors ${style.cell} ${isMatch ? `ring-2 ${style.ring} ring-offset-1` : ''}`}
              >
                {b.name.charAt(0).toUpperCase()}
                {health !== 'healthy' && (
                  <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${style.dot}`} />
                )}
                <AnimatePresence>
                  {hoveredId === b._id && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1.5 rounded-lg bg-slate-900 text-[10px] font-bold text-white shadow-xl z-10"
                    >
                      {b.name}{health !== 'healthy' && <span className="text-amber-300"> · {health}</span>}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BusinessConstellation;
