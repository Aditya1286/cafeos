import React from 'react';
import { AppHeader } from './AppHeader';

interface OrderRow {
  id: string;
  name: string;
  phone: string;
  table: string;
  items: string;
  amount: string;
  paid: boolean;
  method: string;
  status: string;
  statusTone: string;
}

const ROWS: OrderRow[] = [
  {
    id: 'BBA-120926-0005',
    name: 'Rohan Iyer',
    phone: '98••••3412',
    table: 'Table 02',
    items: '1× Iced Uji Matcha Latte',
    amount: '₹210',
    paid: false,
    method: 'UPI',
    status: 'New',
    statusTone: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'BBA-120926-0004',
    name: 'Meera Shah',
    phone: '97••••8820',
    table: 'Table 03',
    items: '2× Iced Uji Matcha Latte',
    amount: '₹420',
    paid: true,
    method: 'ONLINE',
    status: 'Preparing',
    statusTone: 'bg-brand-50 text-brand-700 border-brand-200',
  },
  {
    id: 'BBA-120926-0002',
    name: 'Sneha Patel',
    phone: '98••••5678',
    table: 'Table 01',
    items: '2× Classic Almond Butter Croissant, 1× Iced Uji Matcha Latte',
    amount: '₹588',
    paid: false,
    method: 'CASH',
    status: 'Preparing',
    statusTone: 'bg-brand-50 text-brand-700 border-brand-200',
  },
  {
    id: 'BBA-120926-0001',
    name: 'Aarav Mehta',
    phone: '98••••3210',
    table: 'Table 01',
    items: '1× Classic Almond Butter Croissant, 1× Iced Uji Matcha Latte',
    amount: '₹399',
    paid: true,
    method: 'ONLINE',
    status: 'Completed',
    statusTone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

const FILTERS = ['All Statuses', 'All Payment Statuses', 'All Payment Methods', 'All Time'];

export const OrdersScreen: React.FC = () => (
  <div className="w-full h-full bg-page">
    <AppHeader active="All Orders" />
    <div className="px-6 pt-4">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[13px] font-extrabold text-slate-900">All Orders</span>
        <span className="px-1.5 py-0.5 rounded bg-brand-50 border border-brand-200 text-brand-700 text-[8px] font-black">
          E-BILL READY
        </span>
      </div>
      <div className="text-[10px] text-slate-500 font-medium mb-3">
        Find any order, check its bill, and see what was paid.
      </div>

      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {FILTERS.map((f) => (
          <div
            key={f}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-[10px] font-semibold text-slate-700"
          >
            {f}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-100 text-[10px] text-slate-400 font-medium">
          Search by order no., name, phone, table or payment ID…
        </div>
        <div className="grid grid-cols-[1.2fr_1fr_0.6fr_1.6fr_0.5fr_0.7fr_0.8fr_0.9fr] gap-2 px-3 py-2 text-[8px] font-black text-slate-400 bg-slate-50">
          <span>ORDER</span>
          <span>CUSTOMER</span>
          <span>TABLE</span>
          <span>ITEMS</span>
          <span>AMOUNT</span>
          <span>PAYMENT</span>
          <span>STATUS</span>
          <span className="text-right">ACTIONS</span>
        </div>
        {ROWS.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1.2fr_1fr_0.6fr_1.6fr_0.5fr_0.7fr_0.8fr_0.9fr] gap-2 px-3 py-3 items-center border-t border-slate-100 text-[9px]"
          >
            <span className="font-mono font-black text-brand-700">{r.id}</span>
            <span>
              <span className="block font-extrabold text-slate-900">{r.name}</span>
              <span className="text-slate-400">{r.phone}</span>
            </span>
            <span className="font-bold text-slate-600">{r.table}</span>
            <span className="text-slate-600 truncate">{r.items}</span>
            <span className="font-black text-slate-900">{r.amount}</span>
            <span>
              <span
                className={`inline-block px-1.5 py-0.5 rounded border text-[8px] font-black ${
                  r.paid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {r.paid ? 'PAID' : 'UNPAID'}
              </span>
              <span className="block text-[8px] text-slate-400 mt-0.5">{r.method}</span>
            </span>
            <span>
              <span
                className={`inline-block px-1.5 py-0.5 rounded-full border text-[8px] font-black ${r.statusTone}`}
              >
                {r.status}
              </span>
            </span>
            <span className="flex justify-end gap-1">
              <span className="px-2 py-1 rounded-md bg-slate-900 text-white text-[8px] font-extrabold">
                Details
              </span>
              <span className="px-2 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-700 text-[8px] font-extrabold">
                Bill
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
