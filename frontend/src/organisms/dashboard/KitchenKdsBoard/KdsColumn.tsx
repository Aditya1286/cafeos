import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, X, CheckCircle2, Wallet, CheckSquare } from 'lucide-react';
import { STATUS_CONFIG, NEXT_STATUS, BULK_MOVE, isOrderCancellable } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { KdsBoardViewProps, KdsStatus, kdsColumnOrders } from './types';
import { KDS_ANIMATE_MAX } from '@/constants/kitchen';
import { WaitBadge } from '@/molecules/WaitBadge';
import { KdsOrderTicketCompact } from './KdsOrderTicketCompact';
import { KdsWallTicket } from './KdsWallTicket';

interface KdsColumnProps extends KdsBoardViewProps {
  status: KdsStatus;
  /** Fixed height with its own scroll (desktop side-by-side) vs. natural page height (mobile). */
  scrollable: boolean;
  /** Phone layout: short tickets with details behind a tap, so many orders fit on one screen. */
  compact?: boolean;
  /** Kitchen mode: fills the height it is given and lays big tickets out in a grid. */
  wall?: boolean;
}

/** How many tickets the "oldest" quick-select takes. */
const QUICK_SELECT_COUNT = 10;

/** One status column of the KDS — header, bulk-move bar (when orders are selected), and the order cards. */
export const KdsColumn = ({
  status,
  scrollable,
  compact = false,
  wall = false,
  orders,
  now,
  newlyArrivedOrderId,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onClearSelection,
  onSelectOldest,
  onOpenBulkMove,
  onUpdateStatus,
  onCancel,
  onViewBill,
  onConfirmPayment,
}: KdsColumnProps) => {
  const sc = STATUS_CONFIG[status];
  const columnOrders = useMemo(() => kdsColumnOrders(orders, status), [orders, status]);
  // A layout animation per ticket is fine for a handful and sluggish at fifty, so a long queue
  // just appears and disappears.
  const animateLayout = columnOrders.length <= KDS_ANIMATE_MAX;
  const selectedInColumn = columnOrders.filter((o) => selectedIds.has(o._id || o.orderId)).length;
  const allSelected = columnOrders.length > 0 && selectedInColumn === columnOrders.length;
  const bulkCopy = BULK_MOVE[status];
  // Compact mode: one ticket's details open at a time, so opening one never pushes the rest far down.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${wall ? 'h-full min-h-0' : scrollable ? 'h-[600px]' : ''}`}
    >
      <div
        className="px-4 py-3.5 bg-slate-50 border-b border-slate-200 border-t-4 border-t-brand-500 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {columnOrders.length > 0 && (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleSelectAll(status)}
              title={`Select all ${sc.label.toLowerCase()} orders`}
              className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer"
            />
          )}
          <span className={`w-2.5 h-2.5 rounded-full ${sc.dot}`} />
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            {sc.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {columnOrders.length > QUICK_SELECT_COUNT && (
            <button
              type="button"
              onClick={() => onSelectOldest(status, QUICK_SELECT_COUNT)}
              title={`Select the ${QUICK_SELECT_COUNT} orders that have waited longest`}
              className="px-2 py-1 rounded-lg bg-white/80 border border-slate-200 text-[10px] font-black text-slate-600 hover:bg-white whitespace-nowrap"
            >
              {QUICK_SELECT_COUNT} oldest
            </button>
          )}
          <span
            className={`min-w-6 h-6 px-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shadow-xs`}
          >
            {columnOrders.length}
          </span>
        </div>
      </div>

      {selectedInColumn > 0 && (
        <div className="px-4 py-2 bg-brand-50 border-b border-brand-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-black text-brand-700">{selectedInColumn} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onClearSelection(status)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
            <button
              onClick={() => onOpenBulkMove(status)}
              className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-black flex items-center gap-1 transition-colors"
            >
              <CheckSquare className="w-3 h-3" />
              <span>{bulkCopy.button}</span>
            </button>
          </div>
        </div>
      )}

      <div
        className={`bg-white ${
          wall
            ? 'p-3 grid grid-cols-1 2xl:grid-cols-2 gap-3 content-start'
            : compact
              ? 'p-2.5 space-y-2'
              : 'p-3.5 space-y-3.5'
        } ${wall || scrollable ? 'flex-1 min-h-0 overflow-y-auto' : ''}`}
      >
        <AnimatePresence>
          {columnOrders.map((order) => {
            const targetOrderId = order._id || order.orderId;
            const isNew = newlyArrivedOrderId === targetOrderId;
            const isSelected = selectedIds.has(targetOrderId);
            if (wall) {
              return (
                <KdsWallTicket
                  key={targetOrderId || order.orderNumber}
                  order={order}
                  status={status}
                  now={now}
                  isNew={isNew}
                  isSelected={isSelected}
                  onToggleSelected={() => onToggleSelected(targetOrderId)}
                  onAdvance={() => onUpdateStatus(targetOrderId, NEXT_STATUS[status].status)}
                  onCancel={isOrderCancellable(status) ? () => onCancel(order) : undefined}
                  onViewBill={() => onViewBill(order.orderId || order._id)}
                  onConfirmPayment={() => onConfirmPayment(order)}
                />
              );
            }
            if (compact) {
              return (
                <KdsOrderTicketCompact
                  key={targetOrderId || order.orderNumber}
                  order={order}
                  status={status}
                  isNew={isNew}
                  isSelected={isSelected}
                  expanded={expandedId === targetOrderId}
                  onToggleExpanded={() =>
                    setExpandedId((prev) => (prev === targetOrderId ? null : targetOrderId))
                  }
                  onToggleSelected={() => onToggleSelected(targetOrderId)}
                  onAdvance={() => onUpdateStatus(targetOrderId, NEXT_STATUS[status].status)}
                  onCancel={isOrderCancellable(status) ? () => onCancel(order) : undefined}
                  onViewBill={() => onViewBill(order.orderId || order._id)}
                  onConfirmPayment={() => onConfirmPayment(order)}
                  now={now}
                />
              );
            }
            return (
              <motion.div
                key={targetOrderId || order.orderNumber}
                layout={animateLayout}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md hover:border-brand-300 transition-all p-4 space-y-3 ${
                  isSelected
                    ? 'border-brand-400 ring-4 ring-brand-100'
                    : isNew
                      ? 'border-brand-400 ring-4 ring-brand-100'
                      : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelected(targetOrderId)}
                      className="w-3.5 h-3.5 rounded accent-brand-600 cursor-pointer mr-0.5"
                    />
                    <span className="text-xs font-black text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-lg">
                      {order.orderId || order.orderNumber}
                    </span>
                    {isNew && (
                      <span className="text-[9px] font-black text-white bg-brand-500 px-1.5 py-0.5 rounded-full uppercase animate-pulse">
                        New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <WaitBadge createdAt={order.createdAt} now={now} />
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black">
                      {order.tableName || 'Table 01'}
                    </span>
                  </div>
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
                  <div className="text-xs font-black text-slate-900">
                    {formatCurrency(order.totalAmountPaise)}
                  </div>

                  <div className="flex items-center gap-2">
                    {isOrderCancellable(status) && (
                      <button
                        onClick={() => onCancel(order)}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 transition-colors"
                        title="Cancel Order"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

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
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-2">
            <div
              className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs"
            >
              <CheckCircle2 className="w-6 h-6 text-slate-400" />
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
