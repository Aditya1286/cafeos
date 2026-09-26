import React from 'react';
import { Phone, Mail, ExternalLink, Wallet, Ban, RotateCcw } from 'lucide-react';
import { AdminBusinessSummary } from '@/types';
import { DemoBadge } from '@/atoms/DemoBadge';
import { businessHealthOf, BusinessHealth } from '@/utils/adminInsights';

// Pieces shared by BusinessesGridDesktop (cards) and BusinessesListMobile (expandable rows).

export interface BusinessRowActions {
  onOpenFinance: (businessId: string) => void;
  onOpenStatusModal: (business: { id: string; name: string; status: string }) => void;
  /** Business whose demo flag is mid-save — its toggle is disabled until the request settles. */
  updatingDemoId: string | null;
  onSetDemo: (businessId: string, isDemo: boolean) => void;
}

const AVATAR_STYLE: Record<BusinessHealth, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-amber-50 text-amber-700 border-amber-300',
  suspended: 'bg-slate-100 text-slate-500 border-slate-300',
};
const DOT_STYLE: Record<BusinessHealth, string> = {
  healthy: '',
  overdue: 'bg-amber-500',
  suspended: 'bg-slate-400',
};

/** Initial avatar colored by account health, with a dot when it needs attention. */
export const BusinessAvatar = ({
  business,
  size = 'md',
}: {
  business: AdminBusinessSummary;
  size?: 'sm' | 'md';
}) => {
  const health = businessHealthOf(business);
  return (
    <div
      className={`relative shrink-0 rounded-xl border flex items-center justify-center font-black ${AVATAR_STYLE[health]} ${
        size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'
      }`}
    >
      {business.name.charAt(0).toUpperCase()}
      {health !== 'healthy' && (
        <span
          className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${DOT_STYLE[health]}`}
        />
      )}
    </div>
  );
};

export const BusinessBadges = ({ business }: { business: AdminBusinessSummary }) => (
  <div className="flex flex-wrap items-center gap-1">
    {business.status === 'SUSPENDED' && (
      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold">
        SUSPENDED
      </span>
    )}
    {business.overdueAmountPaise > 0 && (
      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-extrabold">
        OVERDUE
      </span>
    )}
    {business.isDemo && <DemoBadge />}
  </div>
);

/** One-tap call / email / open-menu — the three things support reaches for first. */
export const BusinessContactLinks = ({ business }: { business: AdminBusinessSummary }) => {
  const linkCls =
    'flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors';
  return (
    <div className="flex items-center gap-2">
      {business.phone && (
        <a
          href={`tel:${business.phone.replace(/\s+/g, '')}`}
          className={linkCls}
          title={business.phone}
        >
          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />{' '}
          <span className="truncate">Call</span>
        </a>
      )}
      {business.email && (
        <a href={`mailto:${business.email}`} className={linkCls} title={business.email}>
          <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />{' '}
          <span className="truncate">Email</span>
        </a>
      )}
      <a
        href={`/c/${business.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkCls}
        title={`/c/${business.slug}`}
      >
        <ExternalLink className="w-3.5 h-3.5 text-red-600 shrink-0" />{' '}
        <span className="truncate">Menu</span>
      </a>
    </div>
  );
};

export const DemoToggle = ({
  business,
  updatingDemoId,
  onSetDemo,
}: { business: AdminBusinessSummary } & Pick<
  BusinessRowActions,
  'updatingDemoId' | 'onSetDemo'
>) => {
  const saving = updatingDemoId === business._id;
  return (
    <label
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors ${
        business.isDemo ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      } ${saving ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-extrabold text-slate-800">Demo account</span>
        <span className="block text-[10px] font-medium text-slate-500">
          Not counted in platform reports
        </span>
      </span>
      <input
        type="checkbox"
        checked={!!business.isDemo}
        disabled={saving}
        onChange={(e) => onSetDemo(business._id, e.target.checked)}
        className="w-4 h-4 accent-amber-500 cursor-pointer shrink-0"
      />
    </label>
  );
};

export const BusinessActionButtons = ({
  business,
  onOpenFinance,
  onOpenStatusModal,
}: { business: AdminBusinessSummary } & Pick<
  BusinessRowActions,
  'onOpenFinance' | 'onOpenStatusModal'
>) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => onOpenFinance(business._id)}
      className="flex-1 px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
    >
      <Wallet className="w-3.5 h-3.5" /> Finances
    </button>
    <button
      onClick={() =>
        onOpenStatusModal({ id: business._id, name: business.name, status: business.status })
      }
      className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 ${
        business.status === 'ACTIVE'
          ? 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
      }`}
    >
      {business.status === 'ACTIVE' ? (
        <>
          <Ban className="w-3.5 h-3.5" /> Suspend
        </>
      ) : (
        <>
          <RotateCcw className="w-3.5 h-3.5" /> Reactivate
        </>
      )}
    </button>
  </div>
);
