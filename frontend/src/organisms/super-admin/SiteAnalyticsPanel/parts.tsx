import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const Card: React.FC<{
  title: string;
  sub?: string;
  className?: string;
  children: React.ReactNode;
}> = ({ title, sub, className = '', children }) => (
  <section
    className={`bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm min-w-0 ${className}`}
  >
    <h3 className="text-sm font-black text-slate-900">{title}</h3>
    {sub && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{sub}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="py-6 text-center text-xs font-semibold text-slate-400">{text}</p>
);

/**
 * "▲ 40%" / "▼ 12%" against the previous period; `points` for rates (shown as percentage points).
 * `comparable` false when the previous period had nothing to base a rate on (no visitors at all).
 */
export const Delta: React.FC<{
  current: number;
  previous: number;
  points?: boolean;
  comparable?: boolean;
}> = ({ current, previous, points, comparable = true }) => {
  let diff: number | null;
  if (!comparable) diff = null;
  else if (points) diff = Math.round((current - previous) * 100);
  else diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  if (diff === null)
    return <span className="text-[11px] font-bold text-slate-400">nothing to compare</span>;
  if (diff === 0) return <span className="text-[11px] font-bold text-slate-400">no change</span>;
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-black ${up ? 'text-emerald-600' : 'text-rose-600'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {Math.abs(diff)}
      {points ? ' pts' : '%'}
    </span>
  );
};
