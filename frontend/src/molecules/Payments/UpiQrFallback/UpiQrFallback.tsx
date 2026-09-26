import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildUpiIntentUrl } from '@/utils/upiIntent';

interface UpiQrFallbackProps {
  payeeVpa: string;
  payeeName: string;
  amount: number; // rupees
  transactionRef: string;
}

export const UpiQrFallback: React.FC<UpiQrFallbackProps> = ({
  payeeVpa,
  payeeName,
  amount,
  transactionRef,
}) => {
  const upiUrl = buildUpiIntentUrl({ payeeVpa, payeeName, amount, transactionRef }, 'generic');

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <QRCodeSVG value={upiUrl} size={180} />
      </div>
      <p className="text-[11px] font-bold text-slate-500 text-center max-w-[220px]">
        Scan this with your phone's UPI app to pay
      </p>
    </div>
  );
};
