import React from 'react';
import { openUpiApp } from '@/utils/upiIntent';

interface UpiAppButtonsProps {
  payeeVpa: string;
  payeeName: string;
  amount: number; // rupees
  transactionRef: string;
}

const APPS: { id: 'generic' | 'gpay' | 'phonepe' | 'paytm'; label: string }[] = [
  { id: 'generic', label: 'Any UPI app' },
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
];

export const UpiAppButtons: React.FC<UpiAppButtonsProps> = ({
  payeeVpa,
  payeeName,
  amount,
  transactionRef,
}) => {
  const params = { payeeVpa, payeeName, amount, transactionRef };

  return (
    <div className="grid grid-cols-2 gap-2">
      {APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          onClick={() => openUpiApp(params, app.id)}
          className={
            app.id === 'generic'
              ? 'col-span-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all uppercase tracking-wider'
              : 'py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-100 transition-all'
          }
        >
          {app.label}
        </button>
      ))}
    </div>
  );
};
