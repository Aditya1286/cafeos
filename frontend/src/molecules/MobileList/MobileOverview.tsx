import { useState, ReactNode } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';

interface MobileOverviewProps {
  /** The one line shown while closed, e.g. "25 orders · ₹1,234 today". */
  summary: ReactNode;
  /** What opens up: the stat cards and small print the desktop layout shows all the time. */
  children?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/** The overview of a tab on a phone: one line, closed until tapped, with the refresh button beside it. */
export const MobileOverview = ({
  summary,
  children,
  onRefresh,
  refreshing,
}: MobileOverviewProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="min-w-0 truncate text-xs font-black text-slate-900">{summary}</span>
          {children && (
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          )}
        </button>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh"
            className="p-2 rounded-xl bg-slate-900 text-white shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      {open && children && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-100">{children}</div>
      )}
    </div>
  );
};
