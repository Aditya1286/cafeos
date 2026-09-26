import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, CheckCircle2, Wallet, CheckSquare } from 'lucide-react';
import { STATUS_CONFIG, NEXT_STATUS } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { KdsBoardViewProps, KdsStatus } from './types';
import { KdsOrderTicketCompact } from './KdsOrderTicketCompact';

interface KdsColumnProps extends KdsBoardViewProps {
  status: KdsStatus;
  /** Fixed height with its own scroll (desktop side-by-side) vs. natural page height (mobile). */
  scrollable: boolean;
  /** Phone layout: short tickets with details behind a tap, so many orders fit on one screen. */
  compact?: boolean;
}

/** One status column of the KDS — header, bulk-accept bar (New column only), and the order cards. */
export const KdsColumn = ({
  status,
  scrollable,
  compact = false,
  orders,
  newlyArrivedOrderId,
  selectedIds,
  allNewSelected,
  onToggleSelected,
  onToggleSelectAllNew,
  onClearSelection,
  onOpenBulkAccept,
  onUpdateStatus,
  onCancel,
  onViewBill,
  onConfirmPayment,
}: KdsColumnProps) => {
  const sc = STATUS_CONFIG[status];
  const columnOrders = orders.filter((o) => o.orderStatus === status);
  const isNewOrderColumn = status === 'PLACED';
  // Compact mode: one ticket's details open at a time, so opening one never pushes the rest far down.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${scrollable ? 'h-[600px]' : ''}`}
    >
      <div
        className={`px-4 py-3.5 ${sc.badgeBg} border-b ${sc.borderAccent} border-t-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-2">
          {isNewOrderColumn && columnOrders.length > 0 && (
            <input
              type="checkbox"
              checked={allNewSelected}
              onChange={onToggleSelectAllNew}
              title="Select all new orders"
              className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
            />
          )}
          <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          <span className={`text-xs font-black ${sc.color} uppercase tracking-wider`}>
            {sc.label}
          </span>
        </div>
        <span
          className={`w-6 h-6 rounded-full bg-white border ${sc.badgeText} text-xs font-black flex items-center justify-center shadow-xs`}
        >
          {columnOrders.length}
        </span>
      </div>

      {isNewOrderColumn && selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-blue-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearSelection}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
            <button
              onClick={onOpenBulkAccept}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black flex items-center gap-1 transition-colors"
            >
              <CheckSquare className="w-3 h-3" />
              <span>Accept all selected</span>
            </button>
          </div>
        </div>
      )}

      <div
        className={`bg-slate-50/50 ${compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-3.5'} ${scrollable ? 'flex-1 overflow-y-auto' : ''}`}
      >
        <AnimatePresence>
          {columnOrders.map((order) => {
            const targetOrderId = order._id || order.orderId;
            const isNew = newlyArrivedOrderId === targetOrderId;
            const isSelected = selectedIds.has(targetOrderId);
            if (compact) {
              return (
                <KdsOrderTicketCompact
                  key={targetOrderId || order.orderNumber}
                  order={order}
                  status={status}
                  isNew={isNew}
                  isSelectable={isNewOrderColumn}
                  isSelected={isSelected}
                  expanded={expandedId === targetOrderId}
                  onToggleExpanded={() =>
                    setExpandedId((prev) => (prev === targetOrderId ? null : targetOrderId))
                  }
                  onToggleSelected={() => onToggleSelected(targetOrderId)}
                  onAdvance={() => onUpdateStatus(targetOrderId, NEXT_STATUS[status].status)}
                  onCancel={() => onCancel(order)}
                  onViewBill={() => onViewBill(order.orderId || order._id)}
                  onConfirmPayment={() => onConfirmPayment(order)}
                />
              );
            }
            return (
              <motion.div
                key={targetOrderId || order.orderNumber}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md hover:border-orange-300 transition-all p-4 space-y-3 ${
                  isSelected
                    ? 'border-blue-400 ring-4 ring-blue-100'
                    : isNew
                      ? 'border-orange-400 ring-4 ring-orange-100'
                      : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isNewOrderColumn && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelected(targetOrderId)}
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
                  <div className="text-[10px] font-semibold text-slate-400">
                    {order.customerPhone}
                  </div>
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
                    {order.customerMarkedPaidAt
                      ? 'Customer says paid · Confirm'
                      : 'Confirm Payment'}
                  </button>
                )}

                <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs">
                  {order.items?.map((it: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-slate-700 font-medium"
                    >
                      <span>
                        <strong className="text-slate-900 font-extrabold">{it.quantity}×</strong>{' '}
                        {it.name}
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {formatCurrency(it.itemTotalPaise || it.pricePaise * it.quantity)}
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

                    {NEXT_STATUS[status] && (
                      <button
                        onClick={() => onUpdateStatus(targetOrderId, NEXT_STATUS[status].status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all transform active:scale-95 flex items-center gap-1 ${NEXT_STATUS[status].color}`}
                      >
                        <span>{NEXT_STATUS[status].label}</span>
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
            <div
              className={`w-12 h-12 rounded-2xl ${sc.badgeBg} border ${sc.badgeText} flex items-center justify-center shadow-xs`}
            >
              <CheckCircle2 className={`w-6 h-6 ${sc.color} opacity-60`} />
            </div>
            <div className="text-xs font-black text-slate-400">
              No {sc.label.toLowerCase()} orders
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Kitchen is all caught up</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KdsColumn;
