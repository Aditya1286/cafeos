import React, { useState } from 'react';
import { 
  Search, Calendar, Download, Sun, Moon, Check, 
  ChevronDown, FileSpreadsheet, FileText,
  Activity, Store, Layers, Server, BarChart3, Flame, LogOut, Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME, APP_SLUG } from '../../constants/app';

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
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

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
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'kitchen', label: 'Kitchen KDS', icon: Flame },
    { id: 'plans', label: 'Plans & Subscriptions', icon: Layers },
    { id: 'system', label: 'System Health', icon: Server },
  ];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
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
      </div>
    </header>
  );
};

export default NavbarAdmin;
