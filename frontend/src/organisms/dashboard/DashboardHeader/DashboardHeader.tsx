import React, { useState } from 'react';
import {
  Coffee, Copy, Check, Wifi, Plus, RefreshCw, LogOut, FileText, UtensilsCrossed, QrCode,
  Package, BarChart3, Wallet, Settings, Flame, Undo2, ChevronDown, X
} from 'lucide-react';
import { APP_SLUG } from '@/constants/app';

export type DashboardTab = 'kds' | 'orders' | 'menu' | 'tables' | 'inventory' | 'analytics' | 'ledger' | 'refunds' | 'settings';

interface DashboardHeaderProps {
  user: any;
  business: any;
  activeOrdersCount: number;
  lowStockCount: number;
  refundsNeededCount?: number;
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  copiedUrl: boolean;
  onCopyMenuUrl: () => void;
  loading: boolean;
  onRefresh: () => void;
  onAddItem: () => void;
}

const TABS: { id: DashboardTab; label: string; icon: typeof Flame }[] = [
  { id: 'kds',       label: 'Kitchen KDS', icon: Flame },
  { id: 'orders',    label: 'Orders & History', icon: FileText },
  { id: 'menu',      label: 'Digital Menu', icon: UtensilsCrossed },
  { id: 'tables',    label: 'Tables & QR', icon: QrCode },
  { id: 'inventory', label: 'Inventory',   icon: Package },
  { id: 'analytics', label: 'Analytics',   icon: BarChart3 },
  { id: 'ledger',    label: 'Financial Ledger', icon: Wallet },
  { id: 'refunds',   label: 'Refunds & Cancellations', icon: Undo2 },
  { id: 'settings',  label: 'Settings Hub', icon: Settings },
];

export const DashboardHeader = ({
  user, business, activeOrdersCount, lowStockCount, refundsNeededCount, activeTab, onChangeTab,
  copiedUrl, onCopyMenuUrl, loading, onRefresh, onAddItem
}: DashboardHeaderProps) => {
  const [showNavSheet, setShowNavSheet] = useState(false);

  const badgeFor = (tabId: DashboardTab): number | null => {
    if (tabId === 'kds') return activeOrdersCount || null;
    if (tabId === 'inventory') return lowStockCount || null;
    if (tabId === 'refunds') return refundsNeededCount || null;
    return null;
  };

  const activeTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];
  const ActiveIcon = activeTabDef.icon;
  const activeBadge = badgeFor(activeTab);
  // A quiet signal that something elsewhere needs a look, without spelling out which tab —
  // keeps the collapsed mobile trigger honest about state it isn't currently showing.
  const hasBadgesElsewhere = TABS.some((t) => t.id !== activeTab && (badgeFor(t.id) || 0) > 0);

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="h-16 flex items-center justify-between gap-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-white font-black">
              <Coffee className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="text-base font-black text-white leading-tight flex items-center gap-2">
                <span>{business?.name || 'The Artisan Roastery'}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  PRO BUSINESS
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="truncate max-w-[200px] sm:max-w-[300px]">
                  /c/{business?.slug || 'artisan-cafe'}
                </span>
                <button
                  onClick={onCopyMenuUrl}
                  className="hover:text-orange-400 transition-colors flex items-center gap-1 text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800"
                >
                  {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Menu URL'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live KDS · {activeOrdersCount} active orders</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddItem}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => { localStorage.removeItem(`${APP_SLUG}_token`); window.location.href = '/login'; }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800 text-xs font-bold text-slate-300"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <LogOut className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
          </div>
        </div>

        {/* Desktop: the full tab row — 9 pills need roughly 1000px to fit without crowding,
            so this only takes over at `lg`; the 768–1024px band (tablets, split-screen,
            small laptop windows) still gets the mobile picker below. overflow-x-auto is a
            safety net in case a longer label set or larger badge count outgrows the row. */}
        <div className="hidden lg:flex items-center gap-2 py-2.5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badge = badgeFor(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => onChangeTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap relative ${
                  active
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {badge !== null && badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    active ? 'bg-white/30 text-white' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile & tablet (below `lg`): a compact "current section" trigger instead of a
            cramped/wrapping tab strip — tap it to open a full picker sheet with every
            section as a proper tap target, not a squeezed pill. */}
        <div className="lg:hidden py-2.5">
          <button
            onClick={() => setShowNavSheet(true)}
            className="w-full flex items-center justify-between gap-2 pl-3 pr-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ActiveIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-extrabold truncate">{activeTabDef.label}</span>
              {activeBadge !== null && activeBadge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/30 shrink-0">{activeBadge}</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {hasBadgesElsewhere && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile section picker — every tab as a full-size tap target in a 2-column grid,
          instead of a horizontal scroll or a pile of wrapped pills. */}
      {showNavSheet && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setShowNavSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-black text-white">Go to Section</h3>
              <button
                onClick={() => setShowNavSheet(false)}
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const badge = badgeFor(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onChangeTab(tab.id); setShowNavSheet(false); }}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left transition-all ${
                      active
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/25'
                        : 'bg-slate-900 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-slate-800'}`}>
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[11px] font-extrabold truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                        {tab.label}
                      </span>
                      {badge !== null && badge > 0 && (
                        <span className={`text-[10px] font-mono ${active ? 'text-white/80' : 'text-orange-400'}`}>
                          {badge} {badge === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
