import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, QrCode } from 'lucide-react';
import { DEMO_MENU_PATH } from '@/constants/demo';

interface SentStepProps {
  name: string;
  brand: string;
  phone: string;
}

export const SentStep: React.FC<SentStepProps> = ({ name, brand, phone }) => (
  <div className="text-center py-8 sm:py-10 space-y-4">
    <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
      <CheckCircle2 className="w-7 h-7" />
    </div>
    <h2 className="text-2xl font-black">You’re in, {name.trim().split(' ')[0]}!</h2>
    <p className="text-sm text-slate-600 font-medium max-w-sm mx-auto">
      We’ve got your request and we’ll call you on +91 {phone} to start your free trial for{' '}
      {brand.trim()}.
    </p>
    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
      While you wait, see what your guests will see when they scan a table QR.
    </p>
    <Link
      to={DEMO_MENU_PATH}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-600/20 transition-all"
    >
      <QrCode className="w-4 h-4" /> Try the guest experience
    </Link>
    <div>
      <Link to="/#pricing" className="text-xs font-bold text-red-600 hover:underline">
        See pricing
      </Link>
    </div>
  </div>
);
