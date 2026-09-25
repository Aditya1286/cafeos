import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME } from '@/constants/app';
import { DATE_PRESETS } from './types';

// Pieces shared by NavbarAdminDesktop and NavbarAdminMobile.

/** `compact`: smaller mark and no tagline, for the single-row mobile bar. */
export const AdminBrand = ({ compact = false }: { compact?: boolean }) => (
  <div className={`flex items-center min-w-0 ${compact ? 'gap-2.5' : 'gap-3'}`}>
    <div className={`bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white font-black shadow-lg shadow-red-500/20 shrink-0 ${
      compact ? 'w-8 h-8 rounded-xl text-base' : 'w-10 h-10 rounded-2xl text-xl'
    }`}>
      ☕
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base font-black tracking-tight text-slate-900 truncate">{APP_NAME}</span>
        {/* On the narrowest phones the badge would crowd out the app name itself. */}
        <span className={`px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold border border-red-200 shrink-0 ${
          compact ? 'hidden min-[360px]:inline' : ''
        }`}>
          Super Admin
        </span>
      </div>
      {!compact && (
        <p className="text-[10px] font-bold text-slate-400 tracking-wider">Admin Console</p>
      )}
    </div>
  </div>
);

/** Closes a dropdown on any outside click/tap. */
export const useDismissOnOutsideClick = (open: boolean, onDismiss: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handle = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, [open, onDismiss]);
  return ref;
};

/** Date-range picker driving every date-scoped chart. `compact` shows the short label ("7D"). */
export const DateRangeMenu = ({ dateRange, onDateRangeChange, compact = false }: {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useDismissOnOutsideClick(open, () => setOpen(false));
  const current = DATE_PRESETS.find((p) => p.id === dateRange) || DATE_PRESETS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Date range: ${current.label}`}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
      >
        <Calendar className="w-3.5 h-3.5 text-red-500" />
        <span>{compact ? current.short : current.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 text-xs"
          >
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => { onDateRangeChange(preset.id); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-bold transition-colors ${
                  dateRange === preset.id ? 'bg-red-50 text-red-600' : 'text-slate-700 hover:bg-slate-100'
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
  );
};

export const UserInitial = ({ user }: { user?: any }) => (
  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
  </div>
);
