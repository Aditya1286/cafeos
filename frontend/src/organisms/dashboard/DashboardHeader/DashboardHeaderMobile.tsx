import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Plus, LogOut } from 'lucide-react';
import { TABS, HeaderViewProps } from './types';
import { HeaderBrand, RefreshButton, logout } from './HeaderParts';

/** Mobile & tablet (below `lg`) header: one slim row — hamburger, brand, refresh. Sections,
 * Add Item, and log out all live in a slide-in drawer opened from the hamburger. */
export const DashboardHeaderMobile = ({
  user, business, activeTab, onChangeTab, badgeFor,
  copiedUrl, onCopyMenuUrl, loading, onRefresh, onAddItem,
}: HeaderViewProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // The active section isn't named in the slim bar, so a dot on the hamburger is the signal
  // that some section (new orders, low stock, refunds) needs a look.
  const hasAnyBadge = TABS.some((t) => (badgeFor(t.id) || 0) > 0);

  // While the drawer is open: Esc closes it, and the page behind doesn't scroll.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="h-14 px-3 sm:px-6 flex items-center gap-2.5">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          className="relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
          {hasAnyBadge && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-slate-950" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <HeaderBrand business={business} copiedUrl={copiedUrl} onCopyMenuUrl={onCopyMenuUrl} compact />
        </div>

        <RefreshButton loading={loading} onRefresh={onRefresh} showLabel={false} />
      </div>

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
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50"
            />
            <motion.nav
              key="drawer"
              aria-label="Dashboard sections"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[300px] bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col"
            >
              <div className="h-14 px-3 flex items-center justify-between border-b border-slate-800 shrink-0">
                <span className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Menu</span>
                <button
                  onClick={closeDrawer}
                  aria-label="Close navigation menu"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const badge = badgeFor(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { onChangeTab(tab.id); closeDrawer(); }}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        active ? 'bg-orange-500/15 text-white' : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-orange-400' : 'text-slate-500'}`} />
                      <span className="flex-1 min-w-0 text-xs font-bold truncate">{tab.label}</span>
                      {badge !== null && badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/20 text-orange-400 shrink-0">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
                <button
                  onClick={() => { onAddItem(); closeDrawer(); }}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Menu Item</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-900 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                  <span className="flex-1 min-w-0 text-left text-xs font-bold text-slate-300 truncate">{user?.name || 'Account'}</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 shrink-0">
                    <LogOut className="w-3.5 h-3.5" /> Log out
                  </span>
                </button>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardHeaderMobile;
