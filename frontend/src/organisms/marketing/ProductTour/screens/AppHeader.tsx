import React from 'react';
import { DEMO_CAFE } from '@/constants/demo';

const TABS = [
  'Kitchen',
  'All Orders',
  'Menu',
  'Tables & QR',
  'Analytics',
  'Fees & Payments',
  'Staff',
];

/** The owner dashboard's dark header, as it looks in the real app: café name, live status and
 * the section tabs with the active one highlighted. */
export const AppHeader: React.FC<{ active: string }> = ({ active }) => (
  <div className="bg-white border-b border-slate-200 px-6 pt-4 pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-sm">
          B
        </div>
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-extrabold text-[13px] leading-tight">
            {DEMO_CAFE.name}
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black">
              PRO BUSINESS
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">/c/{DEMO_CAFE.slug}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
          ● Live · 2 orders in kitchen
        </span>
        <span className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[10px] font-extrabold">
          + Add Item
        </span>
      </div>
    </div>

    <div className="flex items-center gap-1 mt-3">
      {TABS.map((tab) => (
        <span
          key={tab}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${
            tab === active ? 'bg-brand-600 text-white' : 'text-slate-600'
          }`}
        >
          {tab}
        </span>
      ))}
    </div>
  </div>
);
