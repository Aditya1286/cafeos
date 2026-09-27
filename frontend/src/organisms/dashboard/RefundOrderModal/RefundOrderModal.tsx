import React from 'react';
import { Undo2 } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import { formatCurrency } from '@/utils/money';

interface RefundOrderModalProps {
  order: any | null;
  refunding: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirms marking a cancelled, paid order refunded. CaféOS doesn't move the money itself, so
 * this only records that someone at the café already sent it back — under their name, for good.
 */
export const RefundOrderModal = ({
  order,
  refunding,
  onClose,
  onConfirm,
}: RefundOrderModalProps) => {
  if (!order) return null;

  return (
    <Modal
      title="Mark this order refunded?"
      onClose={() => !refunding && onClose()}
      maxWidth="max-w-sm"
    >
      <div className="space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 text-violet-600 flex items-center justify-center mx-auto">
          <Undo2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">
            Only do this after {formatCurrency(order.totalAmountPaise)} has been sent back to{' '}
            {order.customerName}.
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Order <span className="font-mono">{order.orderId || order.orderNumber}</span>
            {order.customerPhone ? ` · ${order.customerPhone}` : ''}. The refund is recorded under
            your name and cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={refunding}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all disabled:opacity-50"
          >
            Not Yet
          </button>
          <button
            onClick={onConfirm}
            disabled={refunding}
            className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs shadow-md shadow-violet-600/20 transition-all disabled:opacity-50"
          >
            {refunding ? 'Saving...' : 'Yes, Refunded'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RefundOrderModal;
