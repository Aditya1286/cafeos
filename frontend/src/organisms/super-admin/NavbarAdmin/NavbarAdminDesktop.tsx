import React, { useState } from 'react';
import {
  Search,
  Download,
  Sun,
  Moon,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_SLUG } from '@/constants/app';
import { NavbarAdminViewProps } from './types';
import {
  AdminBrand,
  DateRangeMenu,
  UserInitial,
  useDismissOnOutsideClick,
} from './NavbarAdminParts';

/** Desktop (`lg`+): brand, command search, date/export/theme/user controls, then the full tab row. */
export const NavbarAdminDesktop = ({
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
  navItems,
}: NavbarAdminViewProps) => {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const exportRef = useDismissOnOutsideClick(isExportOpen, () => setIsExportOpen(false));
  const userRef = useDismissOnOutsideClick(isUserOpen, () => setIsUserOpen(false));

  return (
    <>
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between gap-4">
        <AdminBrand />

        <button
          onClick={onOpenCommand}
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all text-xs font-semibold w-72 xl:w-96 justify-between shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search orders, products, businesses...</span>
          </span>
          <kbd className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-mono text-slate-500 font-bold shadow-sm">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems working</span>
          </div>

          <DateRangeMenu dateRange={dateRange} onDateRangeChange={onDateRangeChange} />

          <div ref={exportRef} className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
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
                    <span>Download businesses (CSV)</span>
                  </button>
                  <button
                    onClick={() => {
                      onExport('pdf');
                      setIsExportOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 font-bold hover:bg-slate-100 text-left transition-colors"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    <span>Print summary (PDF)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <div ref={userRef} className="relative">
            <button
              onClick={() => setIsUserOpen(!isUserOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              <UserInitial user={user} />
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

      <div className="border-t border-slate-100 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-8 flex items-center gap-1 xl:gap-1.5 py-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 xl:px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-sm'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default NavbarAdminDesktop;
