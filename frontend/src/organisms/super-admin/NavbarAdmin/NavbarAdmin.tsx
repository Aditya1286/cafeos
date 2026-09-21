import React, { useState } from 'react';
import {
  Search, Calendar, Download, Sun, Moon, Check,
  ChevronDown, FileSpreadsheet, FileText, X,
  Activity, Store, Layers, Server, BarChart3, Flame, LogOut, Wallet, Undo2, LifeBuoy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME, APP_SLUG } from '@/constants/app';

interface NavbarAdminProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onOpenCommand: () => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExport: (format: 'csv' | 'pdf') => void;
  user?: any;
  onLogout?: () => void;
  businessesCount?: number;
  pendingRemittancesCount?: number;
  pendingSubscriptionRequestsCount?: number;
  refundsNeededCount?: number;
  openTicketsCount?: number;
}

export const NavbarAdmin: React.FC<NavbarAdminProps> = ({
  activeTab,
  onTabChange,
  onOpenCommand,
  dateRange,
  onDateRangeChange,
  darkMode,
  onToggleDarkMode,
  onExport,
  user,
  onLogout,
  businessesCount = 3,
  pendingRemittancesCount = 0,
  pendingSubscriptionRequestsCount = 0,
  refundsNeededCount = 0,
  openTicketsCount = 0,
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [showNavSheet, setShowNavSheet] = useState(false);

  const datePresets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
  ];

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'businesses', label: 'Businesses & Finance', icon: Store, count: businessesCount },
    { id: 'remittances', label: 'Remittances', icon: Wallet, count: pendingRemittancesCount || undefined },
    { id: 'refunds', label: 'Refunds & Cancellations', icon: Undo2, count: refundsNeededCount || undefined },
    { id: 'support', label: 'Support Tickets', icon: LifeBuoy, count: openTicketsCount || undefined },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'kitchen', label: 'Kitchen KDS', icon: Flame },
    { id: 'plans', label: 'Plans & Subscriptions', icon: Layers, count: pendingSubscriptionRequestsCount || undefined },
    { id: 'system', label: 'System Health', icon: Server },
  ];

  const activeNavItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const ActiveNavIcon = activeNavItem.icon;
  const hasCountsElsewhere = navItems.some((item) => item.id !== activeTab && (item.count || 0) > 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm">
      {/* Upper Brand & Actions Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-red-500/20 flex-shrink-0">
            ☕
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-slate-900">
                {APP_NAME}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold border border-red-200">
                Super Admin
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider">
              Multi-Tenant Operations Console
            </p>
          </div>
        </div>

        {/* Center Command Palette Search Trigger */}
        <button
          onClick={onOpenCommand}
          className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all text-xs font-semibold w-72 lg:w-96 justify-between shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search orders, products, businesses...</span>
          </span>
          <kbd className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-mono text-slate-500 font-bold shadow-sm">
            ⌘K
          </kbd>
        </button>

        {/* Right Controls Group */}
        <div className="flex items-center gap-2.5">
          {/* Operational Status Dot */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational · v1.0.0</span>
          </div>

          {/* Date Selector */}
          <div className="relative">
            <button
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">
                {datePresets.find((p) => p.id === dateRange)?.label || 'Today'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {isDateOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 text-xs"
                >
                  {datePresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        onDateRangeChange(preset.id);
                        setIsDateOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-bold transition-colors ${
                        dateRange === preset.id
                          ? 'bg-red-50 text-red-600'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {dateRange === preset.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {isExportOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 text-xs"
                >
                  <button
                    onClick={() => {
                      onExport('csv');
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 text-left transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Export CSV Report</span>
                  </button>
                  <button
                    onClick={() => {
                      onExport('pdf');
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 text-left transition-colors"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Export PDF Summary</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dark/Light Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserOpen(!isUserOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {isUserOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 text-xs"
                >
                  <div className="p-2.5 border-b border-slate-100">
                    <div className="font-extrabold text-slate-900">
                      {user?.name || 'Aditya Sharma'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      admin@{APP_SLUG}.com · Super Admin
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsUserOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 font-bold hover:bg-rose-50 text-left transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation Sub-header Tabs */}
      <div className="border-t border-slate-100 bg-slate-50/70">
        {/* Desktop: the full tab row — fits a dashboard-width viewport in one line. */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:flex items-center gap-1.5 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile: a compact "current section" trigger instead of a cramped/wrapping strip. */}
        <div className="md:hidden px-4 py-2">
          <button
            onClick={() => setShowNavSheet(true)}
            className="w-full flex items-center justify-between gap-2 pl-3 pr-4 py-2.5 rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/25"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ActiveNavIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-extrabold truncate">{activeNavItem.label}</span>
              {activeNavItem.count !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/20 shrink-0">{activeNavItem.count}</span>
              )}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {hasCountsElsewhere && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile section picker — every tab as a full-size tap target in a 2-column grid. */}
      {showNavSheet && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setShowNavSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Go to Section</h3>
              <button
                onClick={() => setShowNavSheet(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onTabChange(item.id); setShowNavSheet(false); }}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-red-600 shadow-md shadow-red-600/25'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20' : 'bg-white border border-slate-200'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[11px] font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>
                        {item.label}
                      </span>
                      {item.count !== undefined && (
                        <span className={`text-[10px] font-mono ${isActive ? 'text-white/80' : 'text-red-600'}`}>
                          {item.count} {item.count === 1 ? 'item' : 'items'}
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

export default NavbarAdmin;
