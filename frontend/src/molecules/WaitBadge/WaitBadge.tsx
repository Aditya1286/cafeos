import React from 'react';
import { Clock } from 'lucide-react';
import { waitInfo, type WaitLevel } from '@/utils/kitchenOrders';

const LEVEL_STYLES: Record<WaitLevel, string> = {
  ok: 'bg-slate-100 border-slate-200 text-slate-600',
  warn: 'bg-amber-50 border-amber-200 text-amber-700',
  late: 'bg-rose-50 border-rose-300 text-rose-700',
};

interface WaitBadgeProps {
  createdAt: string | Date | null | undefined;
  /** The board's shared clock (ms), so every badge ticks together. */
  now: number;
  /** `lg` for the Kitchen mode wall, where it is read from across a room. */
  size?: 'sm' | 'lg';
}

/** How long an order has been waiting, coloured by urgency: calm, amber from 10 minutes, red from
 * 20 (see constants/kitchen). Draws nothing when the order has no usable time. */
export const WaitBadge: React.FC<WaitBadgeProps> = ({ createdAt, now, size = 'sm' }) => {
  const info = waitInfo(createdAt, now);
  if (!info) return null;
  const sizing = size === 'lg' ? 'px-2.5 py-1 text-sm gap-1.5' : 'px-2 py-0.5 text-[10px] gap-1';
  return (
    <span
      title={`Waiting ${info.label.replace('<1m', 'less than a minute')}`}
      data-wait-level={info.level}
      className={`inline-flex items-center rounded-full border font-black font-mono shrink-0 ${sizing} ${LEVEL_STYLES[info.level]}`}
    >
      <Clock className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} aria-hidden="true" />
      <span className="sr-only">Waiting </span>
      {info.label}
    </span>
  );
};

export default WaitBadge;
