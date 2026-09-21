import React, { useState } from 'react';
import { 
  Search, Bell, Calendar, Download, Sun, Moon, Check, 
  ChevronDown, ShieldCheck, FileSpreadsheet, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarProps {
  onOpenCommand: () => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExport: (format: 'csv' | 'pdf') => void;
  unreadNotificationsCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCommand,
  dateRange,
  onDateRangeChange,
  darkMode,
  onToggleDarkMode,
  onExport,
  unreadNotificationsCount = 3,
}) => {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const datePresets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'custom', label: 'Custom Range...' },
  ];

  const notifications = [
    { id: '1', title: 'Mozzarella Stock Alert', time: '10m ago', text: 'Stock level down to 1.2 kg (threshold: 2 kg)', type: 'warning' },
    { id: '2', title: 'New Business Signed Up', time: '1h ago', text: 'Urban Espresso Bistro subscribed to Pro Plan', type: 'success' },
    { id: '3', title: 'High Order Volume', time: '2h ago', text: 'Table ordering peak reached 42 orders/min', type: 'info' },
  ];

  return (
    <header className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* ⌘K Command Search Trigger */}
      <button
        onClick={onOpenCommand}
        className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/60 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:border-slate-300 dark:hover:border-zinc-600 transition-all text-xs font-semibold w-64 sm:w-80 justify-between"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          <span>Search orders, products, businesses...</span>
        </span>
        <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono text-slate-500 dark:text-zinc-400 font-bold shadow-xs">
          ⌘K
        </kbd>
      </button>

      {/* Right Action Controls */}
      <div className="flex items-center gap-3">
        {/* Date Range Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDateOpen(!isDateOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-extrabold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 shadow-xs transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-red-500" />
            <span>{datePresets.find((p) => p.id === dateRange)?.label || 'Today'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <AnimatePresence>
            {isDateOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-50 text-xs"
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
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
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

        {/* Export Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-extrabold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700/50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <AnimatePresence>
            {isExportOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-1.5 z-50 text-xs"
              >
                <button
                  onClick={() => {
                    onExport('csv');
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 text-left transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export CSV Report</span>
                </button>
                <button
                  onClick={() => {
                    onExport('pdf');
                    setIsExportOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-zinc-200 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 text-left transition-colors"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  <span>Export PDF Executive</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/50 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-zinc-900" />
            )}
          </button>

          <AnimatePresence>
            {isNotifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
                  <h4 className="text-xs font-black text-slate-900 dark:text-zinc-100">
                    System Alerts & Notifications
                  </h4>
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
                    {unreadNotificationsCount} New
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-zinc-200">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                        {n.text}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle (Dark/Light) */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};

export default TopBar;
