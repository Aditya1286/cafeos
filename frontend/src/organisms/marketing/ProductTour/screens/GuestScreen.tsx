import React from 'react';
import { DEMO_CAFE } from '@/constants/demo';
import { PhoneFrame } from './PhoneFrame';

const ITEMS = [
  { name: 'Classic Almond Butter Croissant', price: '₹189', tone: 'from-amber-200 to-brand-400' },
  { name: 'Iced Uji Matcha Latte', price: '₹210', tone: 'from-lime-200 to-emerald-500' },
];

const STEPS = ['Placed', 'Preparing', 'Ready'];

const MenuPhone: React.FC = () => (
  <PhoneFrame>
    <div className="h-24 bg-gradient-to-br from-amber-700 to-brand-900" />
    <div className="-mt-8 mx-3 rounded-2xl bg-white shadow-lg p-3 relative">
      <div className="text-[11px] font-extrabold text-slate-900 leading-tight">
        {DEMO_CAFE.name}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] text-slate-500 font-medium">5–10 min prep time</span>
        <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[8px] font-black">
          Table 01
        </span>
      </div>
    </div>

    <div className="mx-3 mt-3 rounded-full bg-slate-100 px-3 py-2 text-[10px] text-slate-400 font-medium">
      Search dishes & drinks
    </div>
    <div className="flex gap-2 mx-3 mt-2">
      {['Veg', 'Non-veg'].map((t) => (
        <span
          key={t}
          className="px-2.5 py-1 rounded-full border border-slate-200 text-[9px] font-bold text-slate-600"
        >
          {t}
        </span>
      ))}
    </div>

    <div className="mx-3 mt-3 text-[11px] font-extrabold text-slate-900">
      French Croissants & Pastries
    </div>
    <div className="mx-3 mt-2 grid grid-cols-2 gap-2.5">
      {ITEMS.map((item) => (
        <div key={item.name}>
          <div className={`relative h-20 rounded-xl bg-gradient-to-br ${item.tone}`}>
            <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white text-slate-900 text-sm font-black flex items-center justify-center shadow">
              +
            </span>
          </div>
          <div className="mt-1 text-[9px] font-bold text-slate-900 leading-tight">{item.name}</div>
          <div className="text-[9px] font-black text-slate-700">{item.price}</div>
        </div>
      ))}
    </div>

    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between text-[10px] font-extrabold">
      <span>3 items</span>
      <span>View order · ₹588</span>
    </div>
  </PhoneFrame>
);

const TrackingPhone: React.FC = () => (
  <PhoneFrame>
    <div className="pt-10 px-4">
      <div className="text-[9px] font-black text-brand-700 font-mono">BBA-120926-0002</div>
      <div className="text-[15px] font-black text-slate-900 mt-1 leading-tight">
        Your order is being prepared
      </div>
      <div className="text-[10px] text-slate-500 font-medium mt-1">
        Table 01 · Ready in about 8 mins
      </div>

      <div className="mt-5 space-y-3">
        {STEPS.map((step, i) => {
          const done = i <= 1;
          return (
            <div key={step} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                  done ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              <span
                className={`text-[11px] font-bold ${done ? 'text-slate-900' : 'text-slate-400'}`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-3 text-[10px]">
        <div className="flex justify-between font-semibold text-slate-600">
          <span>2× Classic Almond Butter Croissant</span>
          <span>₹378</span>
        </div>
        <div className="flex justify-between font-semibold text-slate-600 mt-1.5">
          <span>1× Iced Uji Matcha Latte</span>
          <span>₹210</span>
        </div>
        <div className="flex justify-between font-black text-slate-900 mt-2.5 pt-2 border-t border-slate-100">
          <span>Total</span>
          <span>₹588</span>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

export const GuestScreen: React.FC = () => (
  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-brand-50 flex items-center justify-center gap-10">
    <MenuPhone />
    <TrackingPhone />
  </div>
);
