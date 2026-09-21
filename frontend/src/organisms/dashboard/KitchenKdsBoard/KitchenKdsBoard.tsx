import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, FileText, Sparkles, X, CheckCircle2, Clock, ArrowRight, Wallet, CheckSquare } from 'lucide-react';
import { STATUS_CONFIG, NEXT_STATUS, KDS_COLUMN_STATUSES } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { BulkAcceptOrdersModal } from '@/organisms/dashboard/BulkAcceptOrdersModal';

interface KitchenKdsBoardProps {
  orders: any[];
  newlyArrivedOrderId: string | null;
  onViewAllOrders: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onCancel: (order: any) => void;
  onViewBill: (orderId: string) => void;
  onConfirmPayment: (order: any) => void;
  /** Accepts (PLACED -> CONFIRMED) every order in `orderIds` at once; resolves with the ids that actually succeeded. */
  onBulkAccept: (orderIds: string[]) => Promise<string[]>;
}

const orderKey = (order: any) => order._id || order.orderId;

export const KitchenKdsBoard = ({ orders, newlyArrivedOrderId, onViewAllOrders, onUpdateStatus, onCancel, onViewBill, onConfirmPayment, onBulkAccept }: KitchenKdsBoardProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const newOrders = orders.filter(o => o.orderStatus === 'PLACED');
  const allNewSelected = newOrders.length > 0 && newOrders.every(o => selectedIds.has(orderKey(o)));
  const selectedOrders = orders.filter(o => selectedIds.has(orderKey(o)));

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllNew = () => {
    setSelectedIds(prev => {
      if (allNewSelected) {
        const next = new Set(prev);
        newOrders.forEach(o => next.delete(orderKey(o)));
        return next;
      }
      const next = new Set(prev);
      newOrders.forEach(o => next.add(orderKey(o)));
      return next;
    });
  };

  const handleConfirmBulkAccept = async () => {
    setSubmittingBulk(true);
    try {
      await onBulkAccept(Array.from(selectedIds));
    } finally {
      setSubmittingBulk(false);
      setShowBulkModal(false);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-200 flex items-center justify-center">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Live Kitchen Display System (KDS)</h2>
            <p className="text-xs text-slate-500 font-medium">Real-time order progression for kitchen staff</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewAllOrders}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>View All Orders →</span>
          </button>

          <div className="px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black flex items-center gap-1.5 hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            <span>Real-Time Updates Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {KDS_COLUMN_STATUSES.map(colStatus => {
          const sc = STATUS_CONFIG[colStatus];
          const columnOrders = orders.filter(o => o.orderStatus === colStatus);
          const isNewOrderColumn = colStatus === 'PLACED';

          return (
            <div
              key={colStatus}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden"
            >
              <div className={`px-4 py-3.5 ${sc.badgeBg} border-b ${sc.borderAccent} border-t-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  {isNewOrderColumn && columnOrders.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allNewSelected}
                      onChange={toggleSelectAllNew}
                      title="Select all new orders"
                      className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                    />
                  )}
                  <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
                  <span className={`text-xs font-black ${sc.color} uppercase tracking-wider`}>
                    {sc.label}
                  </span>
                </div>
                <span className={`w-6 h-6 rounded-full bg-white border ${sc.badgeText} text-xs font-black flex items-center justify-center shadow-xs`}>
                  {columnOrders.length}
                </span>
              </div>

              {isNewOrderColumn && selectedIds.size > 0 && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-blue-700">{selectedIds.size} selected</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowBulkModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black flex items-center gap-1 transition-colors"
                    >
                      <CheckSquare className="w-3 h-3" />
                      <span>Bulk Accept</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto bg-slate-50/50">
                <AnimatePresence>
                  {columnOrders.map(order => {
                    const targetOrderId = order._id || order.orderId;
                    const isNew = newlyArrivedOrderId === targetOrderId;
                    const isSelected = selectedIds.has(targetOrderId);
                    return (
                      <motion.div
                        key={targetOrderId || order.orderNumber}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`bg-white rounded-2xl border shadow-sm hover:shadow-md hover:border-orange-300 transition-all p-4 space-y-3 ${
                          isSelected ? 'border-blue-400 ring-4 ring-blue-100' : isNew ? 'border-orange-400 ring-4 ring-orange-100' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {isNewOrderColumn && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(targetOrderId)}
                                className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer mr-0.5"
                              />
                            )}
                            <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                              {order.orderId || order.orderNumber}
                            </span>
                            {isNew && (
                              <span className="text-[9px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                                New
                              </span>
                            )}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black">
                            {order.tableName || 'Table 01'}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-black text-slate-900">{order.customerName}</div>
                          <div className="text-[10px] font-semibold text-slate-400">{order.customerPhone}</div>
                        </div>

                        {order.paymentStatus === 'UNPAID' && (
                          <button
                            onClick={() => onConfirmPayment(order)}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-colors ${
                              order.customerMarkedPaidAt
                                ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                                : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            <Wallet className="w-3 h-3" />
                            {order.customerMarkedPaidAt ? 'Customer says paid · Confirm' : 'Confirm Payment'}
                          </button>
                        )}

                        <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs">
                          {order.items?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-slate-700 font-medium">
                              <span>
                                <strong className="text-slate-900 font-extrabold">{it.quantity}×</strong> {it.name}
                              </span>
                              <span className="font-extrabold text-slate-900">
                                {formatCurrency(it.itemTotalPaise || (it.pricePaise * it.quantity))}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs font-black text-emerald-600">
                            {formatCurrency(order.totalAmountPaise)}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onCancel(order)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 transition-colors"
                              title="Cancel Order"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onViewBill(order.orderId || order._id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                              title="View E-Bill"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {NEXT_STATUS[colStatus] && (
                              <button
                                onClick={() => onUpdateStatus(targetOrderId, NEXT_STATUS[colStatus].status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all transform active:scale-95 flex items-center gap-1 ${NEXT_STATUS[colStatus].color}`}
                              >
                                <span>{NEXT_STATUS[colStatus].label}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {columnOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                    <div className={`w-12 h-12 rounded-2xl ${sc.badgeBg} border ${sc.badgeText} flex items-center justify-center shadow-xs`}>
                      <CheckCircle2 className={`w-6 h-6 ${sc.color} opacity-60`} />
                    </div>
                    <div className="text-xs font-black text-slate-400">No {sc.label.toLowerCase()} orders</div>
                    <div className="text-[10px] text-slate-400 font-medium">Kitchen is all caught up</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Recent Completed Orders</h3>
              <p className="text-[11px] font-medium text-slate-500">Latest completed or served transactions</p>
            </div>
          </div>

          <button
            onClick={onViewAllOrders}
            className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {orders.slice(0, 4).map(o => (
            <div key={o._id || o.orderId} className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-black text-slate-900">
                  {o.orderId || o.orderNumber}
                </span>
                <div>
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <span>{o.customerName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({o.tableName || 'Takeaway'})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                    {o.items?.map((it: any) => `${it.quantity}× ${it.name}`).join(', ')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs font-black text-emerald-600">{formatCurrency(o.totalAmountPaise)}</div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{o.paymentMethod || 'ONLINE'} · {o.paymentStatus || 'PAID'}</span>
                </div>

                {o.paymentStatus === 'UNPAID' && (
                  <button
                    onClick={() => onConfirmPayment(o)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{o.customerMarkedPaidAt ? 'Confirm' : 'Mark Paid'}</span>
                  </button>
                )}

                <button
                  onClick={() => onViewBill(o.orderId || o._id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Bill</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showBulkModal && (
        <BulkAcceptOrdersModal
          orders={selectedOrders}
          submitting={submittingBulk}
          onClose={() => setShowBulkModal(false)}
          onConfirm={handleConfirmBulkAccept}
        />
      )}
    </div>
  );
};

export default KitchenKdsBoard;
