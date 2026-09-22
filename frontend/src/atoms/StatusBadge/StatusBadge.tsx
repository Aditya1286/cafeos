import React from 'react';

export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral';

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

interface StatusBadgeProps {
  tone: StatusBadgeTone;
  children: React.ReactNode;
  className?: string;
}

/** The small rounded-pill status label (stock/payment/order status, etc.) repeated with
 * hand-rolled classes across dashboard panels — one place to keep the look consistent. */
export const StatusBadge = ({ tone, children, className = '' }: StatusBadgeProps) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border whitespace-nowrap shrink-0 ${TONE_CLASSES[tone]} ${className}`}
  >
    {children}
  </span>
);

export default StatusBadge;
