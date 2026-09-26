import React from 'react';
import { CheckCircle2, XCircle, Undo2, MessageSquareQuote, Clock } from 'lucide-react';
import { Modal } from '@/molecules/Modal';
import { formatCurrency } from '@/utils/money';

interface RefundHistoryModalProps {
  order: any | null;
  onClose: () => void;
}

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

interface TimelineStep {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  at: string | null;
  color: string;
  detail?: React.ReactNode;
}

/**
 * The dedicated "what happened to this order" popup — every step here reads straight off
 * fields already on the Order document (timeline.cancelledAt, refundRequestedAt/refundReason,
 * refundedAt/refundedByUserId). Nothing is inferred or fabricated; a step that never happened
 * just doesn't render.
 */
export const RefundHistoryModal = ({ order, onClose }: RefundHistoryModalProps) => {
  if (!order) return null;

  const businessName = typeof order.businessId === 'object' ? order.businessId?.name : null;
  const wasPaidWhenCancelled = order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED';

  const steps: TimelineStep[] = [
    {
      key: 'placed',
      icon: Clock,
      label: 'Order Placed',
      at: order.createdAt,
      color: 'bg-slate-400',
    },
    {
      key: 'cancelled',
      icon: XCircle,
      label: 'Order Cancelled',
      at: order.timeline?.cancelledAt || null,
      color: 'bg-rose-500',
      detail: order.cancellationReason ? (
        <span className="italic text-slate-500">"{order.cancellationReason}"</span>
      ) : undefined,
    },
  ];

  if (wasPaidWhenCancelled) {
    steps.push({
      key: 'requested',
      icon: MessageSquareQuote,
      label: 'Refund Requested',
      at: order.refundRequestedAt || null,
      color: 'bg-amber-500',
      detail: order.refundRequestedAt ? (
        order.refundReason ? (
          <span className="italic text-slate-700 font-semibold">"{order.refundReason}"</span>
        ) : (
          <span className="text-slate-400">No note left by the customer.</span>
        )
      ) : (
        <span className="text-slate-400">Business-initiated — no customer request on file.</span>
      ),
    });
    steps.push({
      key: 'refunded',
      icon: Undo2,
      label: 'Marked Refunded',
      at: order.refundedAt || null,
      color: 'bg-violet-500',
      detail: order.refundedByUserId?.name ? (
        <span className="text-slate-500">by {order.refundedByUserId.name}</span>
      ) : undefined,
    });
  }

  return (
    <Modal
      title={`Refund History · ${order.orderId || order.orderNumber}`}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
              Customer
            </span>
            <div className="font-black text-slate-900">{order.customerName}</div>
            <div className="text-slate-500 font-semibold">{order.customerPhone}</div>
          </div>
          {businessName && (
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                Business
              </span>
              <div className="font-black text-slate-900">{businessName}</div>
            </div>
          )}
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
              Amount
            </span>
            <div className="font-black text-slate-900">
              {formatCurrency(order.totalAmountPaise)}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
              Payment
            </span>
            <div className="font-black text-slate-900">
              {order.paymentMethod} · {order.paymentStatus}
            </div>
          </div>
        </div>

        <div className="space-y-0">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const happened = !!step.at;
            return (
              <div key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${happened ? step.color : 'bg-slate-200'} text-white`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 min-h-6 ${happened ? 'bg-slate-300' : 'bg-slate-100'}`}
                    />
                  )}
                </div>
                <div className={`pb-5 ${!happened ? 'opacity-50' : ''}`}>
                  <div className="text-xs font-black text-slate-900">{step.label}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">
                    {happened ? formatDateTime(step.at) : 'Not yet'}
                  </div>
                  {step.detail && <div className="text-[11px] mt-1">{step.detail}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {!wasPaidWhenCancelled && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            This order was never paid, so no refund was needed.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RefundHistoryModal;
