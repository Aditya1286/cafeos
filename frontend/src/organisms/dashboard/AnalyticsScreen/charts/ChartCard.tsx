import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ChartToggle {
  options: string[];
  active: number;
  onChange: (index: number) => void;
}

interface ChartCardProps {
  title: string;
  toggle?: ChartToggle;
  /** Filters this card ignored (from the server), named so the owner is never misled. */
  notApplied?: string[];
  /** First load: nothing to show yet. */
  loading?: boolean;
  /** A reload with the previous numbers still on screen. */
  refreshing?: boolean;
  /** This metric failed (the rest of the screen is fine). */
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
}

const FILTER_NAMES: Record<string, string> = {
  source: 'order source',
  paymentMethod: 'payment',
  daypart: 'time of day',
  category: 'category',
  veg: 'veg filter',
};

/**
 * The frame every analytics slot sits in: a title, an optional two-way toggle, and the states every
 * chart shares (loading, a failed metric, "this card ignores your filter"). The cell it sits in sets
 * its size; the body fills whatever is left, so nothing here ever grows the page.
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  toggle,
  notApplied,
  loading,
  refreshing,
  error,
  onRetry,
  children,
}) => (
  <section
    aria-label={title}
    className={`flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-opacity ${refreshing ? 'opacity-60' : ''}`}
  >
    <header className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
      <h3 className="min-w-0 truncate text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <div className="flex shrink-0 items-center gap-1.5">
        {notApplied && notApplied.length > 0 && (
          <span
            title="This card shows everything: the filters named here do not apply to it."
            className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
          >
            Ignores {notApplied.map((n) => FILTER_NAMES[n] ?? n).join(', ')}
          </span>
        )}
        {toggle && (
          <div
            role="group"
            aria-label={`${title} view`}
            className="flex overflow-hidden rounded-lg border border-slate-200"
          >
            {toggle.options.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={i === toggle.active}
                onClick={() => toggle.onChange(i)}
                className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${i === toggle.active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>

    <div className="min-h-0 flex-1">
      {loading ? (
        <div className="h-full animate-pulse rounded-xl bg-slate-100" aria-label="Loading" />
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
          <AlertCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-500">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  </section>
);
