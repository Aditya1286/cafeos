import React from 'react';

export interface HBarRow {
  key: string;
  label: string;
  value: number;
  /** What is printed at the end of the bar, e.g. "32" or "50%". */
  display: string;
  /** Hover / focus tooltip, e.g. "16 of 32 owners". */
  detail?: string;
  /** A line under the bar, e.g. how many left the quiz at this step. */
  note?: React.ReactNode;
}

interface HBarChartProps {
  rows: HBarRow[];
  /** The value of a full-width bar; defaults to the largest row. */
  max?: number;
  ariaLabel: string;
}

/**
 * A horizontal bar chart: one series, one colour, a bar per row on a full-width track, the value
 * printed at the bar's end and the detail in a tooltip. Labels sit left of the bars from `sm` up
 * and above them on phones, so long answers wrap instead of being cut off.
 */
export const HBarChart: React.FC<HBarChartProps> = ({ rows, max, ariaLabel }) => {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => r.value)));
  return (
    <ul aria-label={ariaLabel} className="space-y-3">
      {rows.map((r) => (
        <li
          key={r.key}
          tabIndex={r.detail ? 0 : undefined}
          aria-label={r.detail ? `${r.label}: ${r.display}. ${r.detail}` : undefined}
          className="group relative grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-start gap-x-3 gap-y-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <span className="text-xs font-bold text-slate-700 leading-snug sm:py-[3px]">
            {r.label}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[22px] rounded-[4px] bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-[4px] bg-brand-500 transition-[width] duration-500 ease-out"
                  style={{ width: `${r.value > 0 ? Math.max(3, (r.value / top) * 100) : 0}%` }}
                />
              </div>
              <span className="w-11 shrink-0 text-right text-xs font-black text-slate-900 tabular-nums">
                {r.display}
              </span>
            </div>
            {r.note && <div className="mt-1">{r.note}</div>}
          </div>
          {r.detail && (
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 -top-7 z-10 hidden group-hover:block group-focus-visible:block px-2 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap shadow-lg"
            >
              {r.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
