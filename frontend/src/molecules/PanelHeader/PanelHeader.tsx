import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PanelHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Icon badge background/text/border classes — defaults to the orange "brand" treatment. */
  iconClassName?: string;
  className?: string;
}

/** The icon-badge + title/subtitle + trailing-actions header row repeated at the top of every
 * dashboard panel. Stacks to two rows below `sm` instead of squeezing title and actions onto
 * one line — the thing that was making panel headers overflow/clip on narrow phones. */
export const PanelHeader = ({
  icon: Icon,
  title,
  subtitle,
  actions,
  iconClassName,
  className = '',
}: PanelHeaderProps) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm ${className}`}
  >
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
          iconClassName || 'bg-orange-500/10 text-orange-600 border border-orange-200'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-black text-slate-900 leading-tight truncate">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>}
      </div>
    </div>

    {actions && (
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">{actions}</div>
    )}
  </div>
);

export default PanelHeader;
