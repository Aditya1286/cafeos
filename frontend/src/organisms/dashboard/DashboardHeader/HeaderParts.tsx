import React from 'react';
import { Coffee, Plus, RefreshCw, LogOut, Wifi } from 'lucide-react';
import { APP_SLUG } from '@/constants/app';
import { MenuUrlHoldToCopy } from './MenuUrlHoldToCopy';
import { HeaderViewProps } from './types';

// Small pieces shared verbatim by DashboardHeaderDesktop and DashboardHeaderMobile — the two
// views differ in layout and navigation, not in what the logo or the refresh button look like.

export const logout = () => {
  localStorage.removeItem(`${APP_SLUG}_token`);
  window.location.href = '/login';
};

/** `compact`: smaller logo and no plan badge, for the single-row mobile bar. */
export const HeaderBrand = ({ business, copiedUrl, onCopyMenuUrl, compact = false }: Pick<HeaderViewProps, 'business' | 'copiedUrl' | 'onCopyMenuUrl'> & { compact?: boolean }) => (
  <div className={`flex items-center min-w-0 ${compact ? 'gap-2.5' : 'gap-3'}`}>
    <div className={`bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white font-black shrink-0 ${
      compact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl'
    }`}>
      <Coffee className={compact ? 'w-4 h-4' : 'w-5.5 h-5.5'} />
    </div>
    <div className="min-w-0">
      <div className="text-base font-black text-white leading-tight flex items-center gap-2 min-w-0">
        <span className="truncate">{business?.name || 'The Artisan Roastery'}</span>
        {!compact && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
            PRO BUSINESS
          </span>
        )}
      </div>
      <div className="mt-0.5 min-w-0">
        <MenuUrlHoldToCopy slug={business?.slug || 'artisan-cafe'} copied={copiedUrl} onCopy={onCopyMenuUrl} />
      </div>
    </div>
  </div>
);

export const LiveOrdersPill = ({ activeOrdersCount }: { activeOrdersCount: number }) => (
  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
    </span>
    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
    <span>Live · {activeOrdersCount} orders in kitchen</span>
  </div>
);

export const AddItemButton = ({ onAddItem }: Pick<HeaderViewProps, 'onAddItem'>) => (
  <button
    onClick={onAddItem}
    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
  >
    <Plus className="w-3.5 h-3.5" />
    <span>Add Item</span>
  </button>
);

export const RefreshButton = ({ loading, onRefresh, showLabel }: Pick<HeaderViewProps, 'loading' | 'onRefresh'> & { showLabel: boolean }) => (
  <button
    onClick={onRefresh}
    aria-label="Refresh"
    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-all"
  >
    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
    {showLabel && <span>Refresh</span>}
  </button>
);

export const UserLogoutButton = ({ user, showIcon }: Pick<HeaderViewProps, 'user'> & { showIcon: boolean }) => (
  <button
    onClick={logout}
    aria-label="Log out"
    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800 text-xs font-bold text-slate-300"
  >
    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
      {user?.name?.charAt(0)?.toUpperCase() || 'A'}
    </div>
    {showIcon && <LogOut className="w-3.5 h-3.5 text-slate-400" />}
  </button>
);
