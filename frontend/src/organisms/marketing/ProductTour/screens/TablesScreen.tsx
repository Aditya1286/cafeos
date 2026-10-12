import React from 'react';
import { AppHeader } from './AppHeader';
import { QrGlyph } from './QrGlyph';

const TABLES = [
  { name: 'Table 01', busy: true },
  { name: 'Table 02', busy: false },
  { name: 'Table 03', busy: false },
  { name: 'Table 04', busy: false },
];

export const TablesScreen: React.FC = () => (
  <div className="w-full h-full bg-page">
    <AppHeader active="Tables & QR" />
    <div className="px-6 pt-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[13px] font-extrabold text-slate-900">Tables & QR Codes</div>
          <div className="text-[10px] text-slate-500 font-medium">
            Customers scan a table's QR code to see the menu and order.
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-brand-500 text-white text-[10px] font-extrabold">
          + Add Table
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex items-center gap-4 mb-3">
        <QrGlyph seed={9} className="w-20 h-20 rounded-lg border border-slate-200 p-1.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-extrabold text-slate-900">Master QR</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-black">
              TAKING ORDERS
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-1 max-w-sm">
            Anyone can scan this to order without a table. Put it at the counter, the entrance, or
            on flyers.
          </div>
          <div className="flex gap-2 mt-2.5">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[9px] font-bold">
              Download
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[9px] font-bold">
              Open
            </span>
          </div>
        </div>
        <span className="w-9 h-5 rounded-full bg-emerald-500 relative">
          <span className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {TABLES.map((t, i) => (
          <div key={t.name} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold text-slate-900">{t.name}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full border text-[8px] font-black ${
                  t.busy
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {t.busy ? 'Occupied' : 'Free'}
              </span>
            </div>
            <QrGlyph seed={i + 2} className="w-24 h-24 mx-auto rounded-md bg-slate-50 p-1.5" />
            <div className="mt-2 rounded-md bg-slate-900 text-white text-[9px] font-bold text-center py-1.5">
              Open this table's menu
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
