import React from 'react';
import {
  Coffee, Copy, Check, Wifi, Plus, RefreshCw, LogOut, FileText, UtensilsCrossed, QrCode,
  Package, BarChart3, Wallet, Settings, Flame, Undo2
} from 'lucide-react';
import { APP_SLUG } from '../../../constants/app';

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
  const badgeFor = (tabId: DashboardTab): number | null => {
    if (tabId === 'kds') return activeOrdersCount || null;
    if (tabId === 'inventory') return lowStockCount || null;
    if (tabId === 'refunds') return refundsNeededCount || null;
    return null;
  };

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

        <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
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
      </div>
    </header>
  );
};

export default DashboardHeader;
