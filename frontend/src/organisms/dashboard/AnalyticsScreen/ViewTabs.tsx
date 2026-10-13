import React from 'react';
import type { ViewConfig, ViewId } from './views';

/** The analytics views, as tabs. Switching is how an owner gets to more charts, instead of scrolling. */
export const ViewTabs: React.FC<{
  views: ViewConfig[];
  active: ViewId;
  onChange: (id: ViewId) => void;
}> = ({ views, active, onChange }) => (
  <div
    role="tablist"
    aria-label="Analytics views"
    className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none]"
  >
    {views.map((v) => (
      <button
        key={v.id}
        type="button"
        role="tab"
        aria-selected={v.id === active}
        onClick={() => onChange(v.id)}
        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-extrabold transition-colors ${v.id === active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
      >
        {v.label}
      </button>
    ))}
  </div>
);
