import React from 'react';
import { AdminBusinessSummary } from '@/types';
import { formatCurrency } from '@/utils/money';
import { formatShortDate } from './businessNetwork';
import {
  BusinessRowActions, BusinessAvatar, BusinessBadges, BusinessContactLinks, DemoToggle, BusinessActionButtons,
} from './BusinessNetworkParts';

/** Desktop/tablet (`md`+): a card per business with its money, contact links, and actions in view. */
export const BusinessesGridDesktop = ({ businesses, ...actions }: { businesses: AdminBusinessSummary[] } & BusinessRowActions) => (
  <div className="grid grid-cols-2 xl:grid-cols-3 gap-5">
    {businesses.map((b) => (
      <div
        key={b._id}
        className="p-5 rounded-3xl bg-slate-50 border border-slate-200 hover:border-red-300 hover:shadow-md transition-all flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <BusinessAvatar business={b} />
          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="font-extrabold text-slate-900 text-base leading-tight truncate" title={b.name}>{b.name}</h4>
            <div className="text-xs font-mono text-red-600 font-bold truncate">/c/{b.slug}</div>
            <BusinessBadges business={b} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-white border border-slate-200 min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Owed</div>
            <div className="text-xs font-black text-slate-900 truncate">{formatCurrency(b.totalCommissionOwedPaise)}</div>
          </div>
          <div className={`p-2.5 rounded-2xl border min-w-0 ${b.overdueAmountPaise > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
            <div className={`text-[10px] font-bold uppercase ${b.overdueAmountPaise > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Overdue</div>
            <div className={`text-xs font-black truncate ${b.overdueAmountPaise > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{formatCurrency(b.overdueAmountPaise)}</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white border border-slate-200 min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Plan</div>
            <div className="text-xs font-black text-slate-900 truncate">{b.currentPlan?.name || '—'}</div>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between gap-2">
          <span>{b.commissionRatePercentage ?? 3}% fee per order</span>
          {formatShortDate(b.nextDueDate) && <span>Next due {formatShortDate(b.nextDueDate)}</span>}
        </div>

        <div className="mt-auto space-y-2.5 pt-3 border-t border-slate-200">
          <BusinessContactLinks business={b} />
          <DemoToggle business={b} updatingDemoId={actions.updatingDemoId} onSetDemo={actions.onSetDemo} />
          <BusinessActionButtons business={b} onOpenFinance={actions.onOpenFinance} onOpenStatusModal={actions.onOpenStatusModal} />
        </div>
      </div>
    ))}
  </div>
);

export default BusinessesGridDesktop;
