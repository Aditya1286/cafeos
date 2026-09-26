import React from 'react';

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium outline-none focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-100 transition-all placeholder:text-slate-400';

export const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-700">{label}</label>
    {children}
  </div>
);

export default FormField;
