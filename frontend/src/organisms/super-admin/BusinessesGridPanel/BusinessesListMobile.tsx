import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { AdminBusinessSummary } from '@/types';
import { formatCurrency } from '@/utils/money';
import { formatShortDate } from './businessNetwork';
import {
  BusinessRowActions, BusinessAvatar, BusinessBadges, BusinessContactLinks, DemoToggle, BusinessActionButtons,
} from './BusinessNetworkParts';

/** Mobile (below `md`): a compact, scannable row per business — name, health, and what it owes —
 * that expands in place to contact links, details, and actions. One row open at a time, so the
 * list stays short enough to scan on a phone. */
export const BusinessesListMobile = ({ businesses, ...actions }: { businesses: AdminBusinessSummary[] } & BusinessRowActions) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {businesses.map((b) => {
        const expanded = expandedId === b._id;
        const nextDue = formatShortDate(b.nextDueDate);
        return (
          <div key={b._id} className={expanded ? 'bg-slate-50/70' : ''}>
            <button
              onClick={() => setExpandedId(expanded ? null : b._id)}
              aria-expanded={expanded}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
            >
              <BusinessAvatar business={b} size="sm" />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="text-sm font-extrabold text-slate-900 truncate">{b.name}</div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 truncate">
                    {b.currentPlan?.name || 'No plan'} · {b.commissionRatePercentage ?? 3}%
                  </span>
                </div>
                <BusinessBadges business={b} />
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-black ${b.overdueAmountPaise > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {formatCurrency(b.totalCommissionOwedPaise)}
                </div>
                <div className="text-[10px] font-bold text-slate-400">owed</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3.5 pb-4 space-y-3">
                    <BusinessContactLinks business={b} />

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 p-3 rounded-xl bg-white border border-slate-200 text-[11px]">
                      <div className="min-w-0">
                        <dt className="font-bold text-slate-400 uppercase text-[10px]">Menu link</dt>
                        <dd className="font-mono font-bold text-red-600 truncate">/c/{b.slug}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-bold text-slate-400 uppercase text-[10px]">Overdue</dt>
                        <dd className={`font-black ${b.overdueAmountPaise > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                          {formatCurrency(b.overdueAmountPaise)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-bold text-slate-400 uppercase text-[10px]">Phone</dt>
                        <dd className="font-semibold text-slate-700 truncate">{b.phone || '—'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="font-bold text-slate-400 uppercase text-[10px]">Next due</dt>
                        <dd className="font-semibold text-slate-700">{nextDue || '—'}</dd>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <dt className="font-bold text-slate-400 uppercase text-[10px]">Email</dt>
                        <dd className="font-semibold text-slate-700 truncate">{b.email}</dd>
                      </div>
                    </dl>

                    <DemoToggle business={b} updatingDemoId={actions.updatingDemoId} onSetDemo={actions.onSetDemo} />
                    <BusinessActionButtons business={b} onOpenFinance={actions.onOpenFinance} onOpenStatusModal={actions.onOpenStatusModal} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default BusinessesListMobile;
