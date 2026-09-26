import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Search, FileSpreadsheet, FileText, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavbarAdminViewProps, ACTIONABLE_NAV_IDS } from './types';
import { AdminBrand, DateRangeMenu, UserInitial } from './NavbarAdminParts';

/** Mobile & tablet (below `lg`): one slim row — hamburger, brand, date range. Sections, search,
 * export, and sign-out live in a slide-in drawer opened from the hamburger. */
export const NavbarAdminMobile = ({
  activeTab,
  onTabChange,
  onOpenCommand,
  dateRange,
  onDateRangeChange,
  onExport,
  user,
  onLogout,
  navItems,
}: NavbarAdminViewProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // The active section isn't named in the slim bar, so a dot on the hamburger flags that a queue
  // (remittances, refunds, tickets, plan requests) has work waiting.
  const hasPendingWork = navItems.some(
    (item) => ACTIONABLE_NAV_IDS.has(item.id) && (item.count || 0) > 0,
  );

  // While the drawer is open: Esc closes it, and the page behind doesn't scroll.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const runAndClose = (fn: () => void) => () => {
    closeDrawer();
    fn();
  };

  return (
    <>
      <div className="h-14 px-3 sm:px-6 flex items-center gap-2.5">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
          {hasPendingWork && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <AdminBrand compact />
        </div>

        <DateRangeMenu dateRange={dateRange} onDateRangeChange={onDateRangeChange} compact />
      </div>

      {/* Portaled to <body>: the header's backdrop-blur makes it the containing block for any
          `position: fixed` descendant, which would otherwise pin the drawer inside the 56px bar. */}
      {createPortal(
        // Re-applies the dashboard's compact mobile type scale, which a portal would otherwise escape.
        <div className="dashboard-compact-type">
          <AnimatePresence>
            {drawerOpen && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={closeDrawer}
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                />
                <motion.nav
                  key="drawer"
                  aria-label="Super admin sections"
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
                  className="fixed inset-y-0 left-0 z-50 w-[82%] max-w-[300px] bg-white border-r border-slate-200 shadow-2xl flex flex-col"
                >
                  <div className="h-14 px-3 flex items-center justify-between border-b border-slate-100 shrink-0">
                    <span className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Menu
                    </span>
                    <button
                      onClick={closeDrawer}
                      aria-label="Close navigation menu"
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-3">
                    <button
                      onClick={runAndClose(onOpenCommand)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold"
                    >
                      <Search className="w-4 h-4 text-slate-400" />
                      <span>Search orders, businesses…</span>
                    </button>

                    <div className="space-y-0.5">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = activeTab === item.id;
                        const actionable = ACTIONABLE_NAV_IDS.has(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onTabChange(item.id);
                              closeDrawer();
                            }}
                            aria-current={active ? 'page' : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                              active
                                ? 'bg-red-50 text-red-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${active ? 'text-red-600' : 'text-slate-400'}`}
                            />
                            <span className="flex-1 min-w-0 text-xs font-bold truncate">
                              {item.label}
                            </span>
                            {item.count !== undefined && (
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono shrink-0 ${
                                  actionable
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-0.5">
                      <span className="block px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Export
                      </span>
                      <button
                        onClick={runAndClose(() => onExport('csv'))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 text-left"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold">Download businesses (CSV)</span>
                      </button>
                      <button
                        onClick={runAndClose(() => onExport('pdf'))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-50 text-left"
                      >
                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                        <span className="text-xs font-bold">Print summary (PDF)</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 border-t border-slate-100 shrink-0">
                    <div className="flex items-center gap-2.5 px-2 py-1.5">
                      <UserInitial user={user} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {user?.name || 'Super Admin'}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">Super Admin</div>
                      </div>
                      {onLogout && (
                        <button
                          onClick={runAndClose(onLogout)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 shrink-0"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Sign out
                        </button>
                      )}
                    </div>
                  </div>
                </motion.nav>
              </>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
};

export default NavbarAdminMobile;
