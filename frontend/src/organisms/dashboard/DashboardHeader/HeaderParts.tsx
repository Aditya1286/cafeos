import React, { useEffect, useRef, useState } from 'react';
import { Coffee, Plus, RefreshCw, LogOut, Wifi, ChevronDown, UserCircle } from 'lucide-react';
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
export const HeaderBrand = ({
  business,
  copiedUrl,
  onCopyMenuUrl,
  compact = false,
}: Pick<HeaderViewProps, 'business' | 'copiedUrl' | 'onCopyMenuUrl'> & { compact?: boolean }) => (
  <div className={`flex items-center min-w-0 ${compact ? 'gap-2.5' : 'gap-3'}`}>
    <div
      className={`bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white font-black shrink-0 ${
        compact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl'
      }`}
    >
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
        <MenuUrlHoldToCopy
          slug={business?.slug || 'artisan-cafe'}
          copied={copiedUrl}
          onCopy={onCopyMenuUrl}
        />
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

/** The user's profile picture, or their initial when they haven't uploaded one. */
export const UserAvatar = ({
  user,
  className = 'w-7 h-7',
}: Pick<HeaderViewProps, 'user'> & { className?: string }) =>
  user?.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className={`${className} rounded-lg object-cover shrink-0`} />
  ) : (
    <span
      className={`${className} rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0`}
    >
      {user?.name?.charAt(0)?.toUpperCase() || 'A'}
    </span>
  );

/** Hidden entirely for users who can't add menu items (no onAddItem). */
export const AddItemButton = ({ onAddItem }: Pick<HeaderViewProps, 'onAddItem'>) =>
  !onAddItem ? null : (
    <button
      onClick={onAddItem}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
    >
      <Plus className="w-3.5 h-3.5" />
      <span>Add Item</span>
    </button>
  );

export const RefreshButton = ({
  loading,
  onRefresh,
  showLabel,
}: Pick<HeaderViewProps, 'loading' | 'onRefresh'> & { showLabel: boolean }) => (
  <button
    onClick={onRefresh}
    aria-label="Refresh"
    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-all"
  >
    <RefreshCw
      className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : 'text-slate-400'}`}
    />
    {showLabel && <span>Refresh</span>}
  </button>
);

/**
 * The avatar in the header. Opens a small account menu — profile settings, and log out — so a
 * click on your own picture no longer logs you out on the spot.
 */
export const UserMenu = ({
  user,
  onOpenProfile,
}: Pick<HeaderViewProps, 'user' | 'onOpenProfile'>) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on a click anywhere else, or Esc.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800 text-xs font-bold text-slate-300"
      >
        <UserAvatar user={user} />
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1 border-b border-slate-800">
            <UserAvatar user={user} className="w-9 h-9" />
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">{user?.name || 'Account'}</p>
              {user?.email && <p className="text-[11px] text-slate-400 truncate">{user.email}</p>}
            </div>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenProfile();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <UserCircle className="w-4 h-4 text-slate-400" /> Profile settings
          </button>
          <button
            role="menuitem"
            onClick={logout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
};
