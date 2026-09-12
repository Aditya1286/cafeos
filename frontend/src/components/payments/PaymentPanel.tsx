
import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { isMobileDevice } from '@/utils/device';
import { UpiAppButtons } from './UpiAppButtons';
import { UpiQrFallback } from './UpiQrFallback';

interface PaymentPanelProps {
  paymentMethod: 'ONLINE' | 'UPI' | 'CASH';
  payeeVpa?: string;
  payeeName: string;
  amount: number; // rupees
  transactionRef: string;
}

/**
 * There's no gateway in this flow, so there's no payment webhook — the
 * business confirms receipt on their own dashboard. This panel's job
 * is only to get the customer's money moving and give them a moment of
 * closure ("I've paid"), not to assert that payment succeeded.
 */
export const PaymentPanel: React.FC<PaymentPanelProps> = ({
  paymentMethod,
  payeeVpa,
  payeeName,
  amount,
  transactionRef,
}) => {
  const [selfReportedPaid, setSelfReportedPaid] = useState(false);

  if (paymentMethod === 'CASH') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-700">Pay at the counter</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Show this screen when you're ready to pay.
        </p>
      </div>
    );
  }

  if (!payeeVpa) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
        <p className="text-xs font-bold text-amber-700">
          Online payment isn't set up for this business yet.
        </p>
        <p className="text-[11px] text-amber-600 mt-1">Please pay at the counter instead.</p>
      </div>
    );
  }

  if (selfReportedPaid) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-1">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
        <p className="text-xs font-black text-emerald-700">Thanks — noted!</p>
        <p className="text-[11px] text-emerald-600">
          The business will confirm your payment shortly.
        </p>
      </div>
    );
  }

  const upiParams = { payeeVpa, payeeName, amount, transactionRef };

  return (
    <div className="space-y-4">
      {isMobileDevice() ? (
        <UpiAppButtons {...upiParams} />
      ) : (
        <UpiQrFallback {...upiParams} />
      )}

      <button
        type="button"
        onClick={() => setSelfReportedPaid(true)}
        className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[11px] hover:bg-slate-50 transition-all"
      >
        I've already paid
      </button>

      <p className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        Payment goes directly to the business
      </p>
    </div>
  );
};