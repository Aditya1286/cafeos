import React from 'react';
import { AppHeader } from './AppHeader';

interface KitchenOrder {
  id: string;
  table: string;
  name: string;
  items: string[];
  total: string;
  action: string;
}

interface KitchenColumn {
  title: string;
  accent: string;
  head: string;
  button: string;
  orders: KitchenOrder[];
}

const COLUMNS: KitchenColumn[] = [
  {
    title: 'NEW ORDER',
    accent: 'text-purple-700',
    head: 'bg-purple-50 border-purple-200',
    button: 'bg-purple-600',
    orders: [
      {
        id: 'BBA-120926-0005',
        table: 'Table 02',
        name: 'Rohan Iyer',
        items: ['1× Iced Uji Matcha Latte'],
        total: '₹210',
        action: 'Accept order',
      },
      {
        id: 'BBA-120926-0006',
        table: 'Table 04',
        name: 'Isha Kapoor',
        items: ['1× Classic Almond Butter Croissant'],
        total: '₹189',
        action: 'Accept order',
      },
    ],
  },
  {
    title: 'PREPARING',
    accent: 'text-brand-700',
    head: 'bg-brand-50 border-brand-200',
    button: 'bg-brand-500',
    orders: [
      {
        id: 'BBA-120926-0002',
        table: 'Table 01',
        name: 'Sneha Patel',
        items: ['2× Classic Almond Butter Croissant', '1× Iced Uji Matcha Latte'],
        total: '₹588',
        action: 'Mark ready',
      },
      {
        id: 'BBA-120926-0004',
        table: 'Table 03',
        name: 'Meera Shah',
        items: ['2× Iced Uji Matcha Latte'],
        total: '₹420',
        action: 'Mark ready',
      },
      {
        id: 'BBA-120926-0001',
        table: 'Table 02',
        name: 'Dev Malhotra',
        items: ['1× Classic Almond Butter Croissant'],
        total: '₹189',
        action: 'Mark ready',
      },
    ],
  },
  {
    title: 'READY TO SERVE',
    accent: 'text-emerald-700',
    head: 'bg-emerald-50 border-emerald-200',
    button: 'bg-emerald-600',
    orders: [
      {
        id: 'BBA-120926-0003',
        table: 'Counter',
        name: 'Aarav Mehta',
        items: ['1× Iced Uji Matcha Latte'],
        total: '₹210',
        action: 'Mark served',
      },
    ],
  },
];

export const KitchenScreen: React.FC = () => (
  <div className="w-full h-full bg-page">
    <AppHeader active="Kitchen" />
    <div className="px-6 pt-4">
      <div className="mb-3">
        <div className="text-[13px] font-extrabold text-slate-900">Kitchen — Live Orders</div>
        <div className="text-[10px] text-slate-500 font-medium">
          New orders show up here instantly. Move each one along, or select several to move at once.
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map((col) => (
          <div
            key={col.title}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            <div
              className={`px-3 py-2 border-b flex items-center justify-between text-[10px] font-black ${col.head} ${col.accent}`}
            >
              {col.title}
              <span className="px-1.5 rounded-full bg-white border border-current text-[9px]">
                {col.orders.length}
              </span>
            </div>
            <div className="p-2.5 space-y-2.5 min-h-[260px]">
              {col.orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg border border-slate-200 p-2.5 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-1 py-0.5 rounded bg-brand-50 border border-brand-200 text-brand-700 font-mono text-[7px] font-black whitespace-nowrap">
                      {o.id}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-[7px] font-bold text-slate-500 px-1 py-0.5 rounded-full bg-slate-100">
                      {o.table}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] font-extrabold text-slate-900">{o.name}</div>
                  <div className="mt-1 space-y-0.5 text-[9px] text-slate-600 font-medium">
                    {o.items.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700">{o.total}</span>
                    <span
                      className={`px-2 py-1 rounded-md text-white text-[8px] font-extrabold ${col.button}`}
                    >
                      {o.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
