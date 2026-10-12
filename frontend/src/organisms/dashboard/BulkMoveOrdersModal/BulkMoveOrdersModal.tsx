import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import { formatCurrency } from '@/utils/money';
import { INVENTORY_ENABLED } from '@/constants/features';
import { BULK_MOVE } from '@/constants/orderStatus';

interface BulkMoveOrdersModalProps {
  /** The column the orders are in; decides what moving them forward means. */
  fromStatus: string;
  orders: any[];
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Review-before-you-commit step for moving several orders forward at once (New -> Preparing,
 * Preparing -> Ready, Ready -> Completed) — shows exactly which orders (customer, table, items,
 * amount) are about to move. Starting New orders also takes their ingredients off the stock, and
 * completing orders marks them paid, and neither can be individually undone from here.
 */
export const BulkMoveOrdersModal = ({
  fromStatus,
  orders,
  submitting,
  onClose,
  onConfirm,
}: BulkMoveOrdersModalProps) => {
  if (orders.length === 0) return null;

  const copy = BULK_MOVE[fromStatus];
  const plural = orders.length === 1 ? '' : 's';

  const totalAmountPaise = orders.reduce((sum, o) => sum + (o.totalAmountPaise || 0), 0);

  return (
    <Modal
      title={`${copy.verb} ${orders.length} order${plural}?`}
      onClose={() => !submitting && onClose()}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 font-medium">
          Review the orders below, then confirm to move all of them at once.
          {fromStatus === 'PLACED' &&
            INVENTORY_ENABLED &&
            ' Stock for each item will go down automatically.'}
          {fromStatus === 'READY' && ' Completed orders are marked as paid.'}
        </p>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
          {orders.map((o) => (
            <div key={o._id || o.orderId} className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-lg">
                  {o.orderId || o.orderNumber}
                </span>
                <span className="text-xs font-black text-slate-900">
                  {formatCurrency(o.totalAmountPaise)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 font-semibold">
                <span className="truncate">
                  {o.customerName} · {o.tableName || 'Takeaway'}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium truncate">
                {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500">
          <span>
            Total across {orders.length} order{orders.length === 1 ? '' : 's'}
          </span>
          <span className="text-slate-900 font-black">{formatCurrency(totalAmountPaise)}</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>
              {submitting ? copy.progress : `${copy.verb} ${orders.length} order${plural}`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkMoveOrdersModal;
