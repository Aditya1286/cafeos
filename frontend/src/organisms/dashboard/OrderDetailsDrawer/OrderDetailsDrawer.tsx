import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, FileText, Undo2, Wallet } from 'lucide-react';
import { STATUS_CONFIG, isOrderCancellable } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';

interface OrderDetailsDrawerProps {
  order: any | null;
  orderDetails: any | null;
  onClose: () => void;
  onViewBill: (orderId: string) => void;
  onCancel: (order: any) => void;
  /** Omitted for staff — confirming a refund was sent is the owner's/manager's job. */
  onMarkRefunded?: (order: any) => void;
  onConfirmPayment: (order: any) => void;
}

const PAYMENT_BADGE_CLASS: Record<string, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REFUNDED: 'bg-violet-50 text-violet-700 border-violet-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
};

const needsRefund = (order: any) =>
  order.orderStatus === 'CANCELLED' && order.paymentStatus === 'PAID';

export const OrderDetailsDrawer = ({
  order,
  orderDetails,
  onClose,
  onViewBill,
  onCancel,
  onMarkRefunded,
  onConfirmPayment,
}: OrderDetailsDrawerProps) => (
  <AnimatePresence>
    {order && (
      <div
        className="fixed inset-0 z-50 overflow-hidden"
        style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed inset-y-0 right-0 max-w-full flex pl-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                  Order Details
                </span>
                <div className="text-lg font-black text-orange-600 font-mono flex items-center gap-2">
                  <span>{order.orderId || order.orderNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      STATUS_CONFIG[order.orderStatus]?.badgeBg || 'bg-slate-100'
                    } ${STATUS_CONFIG[order.orderStatus]?.badgeText || 'text-slate-700'}`}
                  >
                    {order.orderStatus}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Customer</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-sm font-black text-slate-900">{order.customerName}</div>
                <div className="text-xs font-semibold text-slate-500">{order.customerPhone}</div>

                {orderDetails?.customerStats && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>
                      {orderDetails.customerStats.previousOrdersCount || 1} previous orders
                    </span>
                    <span className="text-emerald-600 font-black">
                      {formatCurrency(orderDetails.customerStats.lifetimeSpendPaise)} lifetime spend
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                    Table Number
                  </span>
                  <div className="text-xs font-black text-slate-800">
                    {order.tableName || 'Takeaway'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                    Ordered From
                  </span>
                  <div className="text-xs font-black text-slate-800">
                    {order.source || 'QR_TABLE'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Ordered Items
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {order.items?.map((it: any, i: number) => (
                    <div key={i} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900">
                          <span className="text-orange-600">{it.quantity}×</span> {it.name}
                        </div>
                        {it.variantName && (
                          <div className="text-[10px] font-medium text-slate-400">
                            Variant: {it.variantName}
                          </div>
                        )}
                        {it.addons && it.addons.length > 0 && (
                          <div className="text-[10px] font-medium text-slate-400">
                            Addons: {it.addons.map((a: any) => a.name).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="font-black text-slate-900">
                        {formatCurrency(it.itemTotalPaise || it.pricePaise * it.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotalPaise)}</span>
                </div>

                <div className="flex justify-between text-slate-500 font-medium">
                  <span>
                    GST Tax
                    {order.subtotalPaise
                      ? ` (${Math.round((order.taxPaise / order.subtotalPaise) * 1000) / 10}%)`
                      : ''}
                  </span>
                  <span>{formatCurrency(order.taxPaise)}</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                  <span>Total Paid</span>
                  <span className="text-emerald-600">{formatCurrency(order.totalAmountPaise)}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">
                    Payment
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${PAYMENT_BADGE_CLASS[order.paymentStatus] || PAYMENT_BADGE_CLASS.PAID}`}
                  >
                    {order.paymentStatus || 'PAID'}
                  </span>
                </div>
                <div className="font-bold text-slate-800">
                  Method: {order.paymentMethod || 'ONLINE'}
                </div>
                {order.transactionId && (
                  <div className="font-mono text-[10px] text-slate-500">
                    Txn: {order.transactionId}
                  </div>
                )}
                {order.customerMarkedPaidAt && order.paymentStatus === 'UNPAID' && (
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase">
                    Customer says they've paid — verify before serving
                  </div>
                )}
                {order.refundRequestedAt && order.paymentStatus === 'PAID' && (
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black">
                    Customer requested a refund on{' '}
                    {new Date(order.refundRequestedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                    {order.refundReason ? ` — "${order.refundReason}"` : ''}
                  </div>
                )}
                {order.paymentStatus === 'REFUNDED' && order.refundedAt && (
                  <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-black">
                    Refunded on{' '}
                    {new Date(order.refundedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-xs">
                  <span className="text-[10px] font-extrabold uppercase text-amber-700 block">
                    Customer Notes
                  </span>
                  <p className="text-amber-900 font-medium italic">"{order.notes}"</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-2">
              <button
                onClick={() => {
                  const idToUse = order.orderId || order._id;
                  onClose();
                  onViewBill(idToUse);
                }}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>View & Print Bill</span>
              </button>

              {order.paymentStatus === 'UNPAID' && order.orderStatus !== 'CANCELLED' && (
                <button
                  onClick={() => onConfirmPayment(order)}
                  className="w-full py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>
                    {order.customerMarkedPaidAt
                      ? 'Confirm Payment (Customer says paid)'
                      : 'Confirm Payment'}
                  </span>
                </button>
              )}

              {needsRefund(order) && onMarkRefunded && (
                <button
                  onClick={() => onMarkRefunded(order)}
                  className="w-full py-3 rounded-xl bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-black text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>Mark Refunded</span>
                </button>
              )}

              {isOrderCancellable(order.orderStatus) && (
                <button
                  onClick={() => onCancel(order)}
                  className="w-full py-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default OrderDetailsDrawer;
