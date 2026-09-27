import React from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import { formatCurrency } from '@/utils/money';

interface CancelOrderModalProps {
  order: any | null;
  cancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelOrderModal = ({
  order,
  cancelling,
  onClose,
  onConfirm,
}: CancelOrderModalProps) => {
  if (!order) return null;

  return (
    <Modal title="Cancel this order?" onClose={() => !cancelling && onClose()} maxWidth="max-w-sm">
      <div className="space-y-5 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <X className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">
            Do you really want to cancel order{' '}
            <span className="font-mono text-rose-600">{order.orderId || order.orderNumber}</span>?
          </p>
          <p className="text-xs text-slate-500 font-medium">
            For {order.customerName} · {order.tableName || 'Takeaway'}. This cannot be undone.
          </p>
        </div>
        {order.paymentStatus === 'PAID' && (
          <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            This order is already paid. Cancelling it means the customer must be refunded{' '}
            {formatCurrency(order.totalAmountPaise)}. It stays "Refund pending" until someone marks
            it refunded.
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all disabled:opacity-50"
          >
            No, Keep Order
          </button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
          >
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelOrderModal;
