import React from 'react';
import { AppHeader } from './AppHeader';

const SALES = [
  { day: 'Tue', value: 38 },
  { day: 'Wed', value: 52 },
  { day: 'Thu', value: 47 },
  { day: 'Fri', value: 71 },
  { day: 'Sat', value: 96 },
  { day: 'Sun', value: 88 },
  { day: 'Mon', value: 61 },
];

const MAX = 100;

export const NumbersScreen: React.FC = () => (
  <div className="w-full h-full bg-page">
    <AppHeader active="Analytics" />
    <div className="px-6 pt-4">
      <div className="text-[13px] font-extrabold text-slate-900">Sales Report</div>
      <div className="text-[10px] text-slate-500 font-medium mb-3">
        Orders and money earned each day (last 7 days)
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[11px] font-extrabold text-slate-900 mb-3">Sales per Day (₹)</div>
          <div className="flex items-end justify-between gap-3 h-[200px] border-b border-slate-200">
            {SALES.map((s) => (
              <div key={s.day} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-t-md bg-brand-500"
                  style={{ height: `${(s.value / MAX) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-3 mt-1.5">
            {SALES.map((s) => (
              <span key={s.day} className="flex-1 text-center text-[9px] font-bold text-slate-400">
                {s.day}
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-extrabold text-slate-900">Returning Customers</div>
            <div className="text-[9px] text-slate-500 font-medium mb-3">
              How many come back, and how much they spend
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="bg-brand-500 w-[38%]" />
              <div className="bg-slate-300 w-[62%]" />
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-bold">
              <span className="text-brand-700">38% repeat</span>
              <span className="text-slate-500">62% first-time</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-[11px] font-extrabold text-slate-900">
              How Fast Orders Are Ready
            </div>
            <div className="text-[9px] text-slate-500 font-medium mb-3">
              Based on your real orders
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900">11</span>
              <span className="text-[10px] font-bold text-slate-500">min on average</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
