import React from 'react';
import { KpiTile } from './types';

/** Mobile (below `md`): a compact 2×2 grid — value and a short caption only, so all four KPIs sit
 * above the fold instead of four full-width cards stacked down the page. */
export const KpiOverviewBentoMobile = ({ tiles }: { tiles: KpiTile[] }) => (
  <div className="grid grid-cols-2 gap-2.5">
    {tiles.map((t) => (
      <div
        key={t.key}
        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 min-w-0"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
          {t.icon}
        </div>
        <div className="text-xl font-black text-slate-900 tracking-tight truncate">{t.value}</div>
        <div className="text-[11px] font-semibold text-slate-500 leading-snug">{t.label}</div>
      </div>
    ))}
  </div>
);

export default KpiOverviewBentoMobile;
