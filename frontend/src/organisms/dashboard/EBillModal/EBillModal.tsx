import React from 'react';
import { Printer, Share2, Coffee } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import { APP_NAME } from '@/constants/app';
import { toast } from '@/utils/toast';
import { formatCurrency } from '@/utils/money';

interface EBillModalProps {
  bill: any | null;
  onClose: () => void;
}

export const EBillModal = ({ bill, onClose }: EBillModalProps) => {
  if (!bill) return null;

  const effectiveTaxPercentage = bill.subtotalPaise
    ? Math.round((bill.taxPaise / bill.subtotalPaise) * 1000) / 10
    : (bill.business?.taxRatePercentage ?? 0);

  return (
    <Modal title={`Bill · ${bill.orderId || bill.billNumber}`} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-6" id="printable-ebill">

        <div className="p-6 bg-white border border-slate-300 rounded-2xl shadow-inner font-mono text-xs text-slate-800 space-y-4">

          <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white font-black text-base flex items-center justify-center mx-auto mb-2">
              <Coffee className="w-5 h-5" />
            </div>
            <h2 className="text-base font-black uppercase text-slate-900 tracking-wider">
              {bill.business?.name || 'THE ARTISAN ROASTERY'}
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">{bill.business?.address || 'Bandra West, Mumbai'}</p>
            <p className="text-[10px] text-slate-500 font-sans">Phone: {bill.business?.phone || '+91 9876543210'}</p>
            <div className="pt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-700 uppercase">
                TAX INVOICE / E-BILL
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Order ID</span>
              <span className="font-black text-orange-600">{bill.orderId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Date & Time</span>
              <span className="font-bold">{new Date(bill.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Customer</span>
              <span className="font-bold">{bill.customer?.name || 'Guest'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[9px] uppercase font-sans font-bold">Table</span>
              <span className="font-bold">{bill.table || 'Takeaway'}</span>
            </div>
          </div>

          <table className="w-full text-left text-[11px]">
            <thead className="border-b border-slate-300 text-slate-400 text-[9px] uppercase">
              <tr>
                <th className="py-1">ITEM</th>
                <th className="py-1 text-center">QTY</th>
                <th className="py-1 text-right">PRICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans font-semibold">
              {bill.items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-2 text-slate-900">
                    {item.name}
                    {item.variantName && <span className="block text-[9px] text-slate-400">({item.variantName})</span>}
                  </td>
                  <td className="py-2 text-center text-slate-700">{item.quantity}</td>
                  <td className="py-2 text-right text-slate-900 font-bold">
                    {formatCurrency(item.itemTotalPaise || (item.pricePaise * item.quantity))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-slate-300 pt-3 space-y-1.5 text-xs font-sans">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(bill.subtotalPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST ({effectiveTaxPercentage}%)</span>
              <span>{formatCurrency(bill.taxPaise)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>GRAND TOTAL</span>
              <span className="text-emerald-600 font-mono text-base">{formatCurrency(bill.totalAmountPaise)}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5 font-sans">
            <div className="text-[10px] font-extrabold uppercase text-slate-500">
              PAYMENT METHOD: {bill.paymentMethod || 'ONLINE'} · STATUS: <span className="text-emerald-600">{bill.paymentStatus || 'PAID'}</span>
            </div>
            {bill.transactionId && (
              <div className="text-[9px] font-mono text-slate-400">Ref Txn: {bill.transactionId}</div>
            )}
          </div>

          <div className="text-center pt-2 text-[10px] font-sans text-slate-400 space-y-1">
            <p>Thank you for visiting! ❤️</p>
            <p className="font-mono text-[9px]">Powered by {APP_NAME} POS System</p>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.print()}
            className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill</span>
          </button>

          <button
            onClick={() => toast.success('Bill copied!')}
            className="py-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-black text-xs transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Bill</span>
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default EBillModal;
