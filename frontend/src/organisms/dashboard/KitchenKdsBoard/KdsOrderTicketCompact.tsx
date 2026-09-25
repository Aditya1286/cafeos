import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, FileText, Wallet, X } from 'lucide-react';
import { NEXT_STATUS } from '@/constants/orderStatus';
import { formatCurrency } from '@/utils/money';
import { KdsStatus } from './types';

interface KdsOrderTicketCompactProps {
  order: any;
  status: KdsStatus;
  isNew: boolean;
  isSelectable: boolean;
  isSelected: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleSelected: () => void;
  onAdvance: () => void;
  onCancel: () => void;
  onViewBill: () => void;
  onConfirmPayment: () => void;
}

/**
 * Phone-sized KDS ticket: only what the kitchen acts on — order no., table, what to cook, total
 * and the next-step button — so many orders fit on one screen during a rush. Customer details,
 * item prices, payment confirmation, cancel and bill live behind "Details".
 */
export const KdsOrderTicketCompact = ({
  order, status, isNew, isSelectable, isSelected, expanded,
  onToggleExpanded, onToggleSelected, onAdvance, onCancel, onViewBill, onConfirmPayment,
}: KdsOrderTicketCompactProps) => {
  const next = NEXT_STATUS[status];
  const unpaid = order.paymentStatus === 'UNPAID';
  const itemsSummary = (order.items || []).map((it: any) => `${it.quantity}× ${it.name}`).join(', ');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`bg-white rounded-2xl border shadow-sm p-3 space-y-2 ${
        isSelected ? 'border-blue-400 ring-2 ring-blue-100' : isNew ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isSelectable && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelected}
            aria-label={`Select order ${order.orderId || order.orderNumber}`}
            className="w-4 h-4 rounded accent-blue-600 shrink-0"
          />
        )}
        <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg shrink-0">
          {order.orderId || order.orderNumber}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black truncate">
          {order.tableName || 'Counter'}
        </span>
        {isNew && (
          <span className="text-[9px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded-full uppercase animate-pulse shrink-0">
            New
          </span>
        )}
        <span className="ml-auto text-xs font-black text-emerald-600 shrink-0">{formatCurrency(order.totalAmountPaise)}</span>
      </div>

      {/* What to cook — the one thing the kitchen must always see without tapping. */}
      <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">{itemsSummary}</p>

      <div className="flex items-center gap-2">
        {unpaid && (
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
              order.customerMarkedPaidAt ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {order.customerMarkedPaidAt ? 'Says paid' : 'Unpaid'}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="flex items-center gap-0.5 px-1.5 py-2 text-[11px] font-bold text-slate-500 shrink-0"
        >
          Details
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {next && (
          <button
            type="button"
            onClick={onAdvance}
            className={`ml-auto px-3 py-2 rounded-xl text-xs font-extrabold active:scale-95 transition-transform whitespace-nowrap ${next.color}`}
          >
            {next.label}
          </button>
        )}
      </div>

      {expanded && (
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="text-xs">
            <span className="font-black text-slate-900">{order.customerName}</span>
            {order.customerPhone && <span className="ml-2 font-semibold text-slate-400">{order.customerPhone}</span>}
          </div>

          <div className="space-y-1 text-xs">
            {order.items?.map((it: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-slate-700 font-medium">
                <span>
                  <strong className="text-slate-900 font-extrabold">{it.quantity}×</strong> {it.name}
                </span>
                <span className="font-extrabold text-slate-900 shrink-0">
                  {formatCurrency(it.itemTotalPaise || it.pricePaise * it.quantity)}
                </span>
              </div>
            ))}
          </div>

          {unpaid && (
            <button
              type="button"
              onClick={onConfirmPayment}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-extrabold uppercase ${
                order.customerMarkedPaidAt
                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                  : 'bg-slate-50 border border-slate-200 text-slate-600'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              {order.customerMarkedPaidAt ? 'Customer says paid · Confirm' : 'Confirm Payment'}
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onViewBill}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-slate-600 text-[11px] font-bold"
            >
              <FileText className="w-3.5 h-3.5" /> Bill
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-rose-200 text-rose-600 text-[11px] font-bold"
            >
              <X className="w-3.5 h-3.5" /> Cancel order
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default KdsOrderTicketCompact;
