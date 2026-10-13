import React from 'react';
import { useElementSize } from '@/hooks/useElementSize';
import type { KpiResult } from '@/services/dashboard/analytics/types';
import { changeTone, formatChange, formatValue } from '@/utils/analyticsFormat';

const ARROWS = { up: '▲', down: '▼', flat: '■', none: '' } as const;
const TONE_CLASS = {
  good: 'text-emerald-600',
  bad: 'text-rose-600',
  neutral: 'text-slate-500',
} as const;

/** A tiny trend line: no axes, it only shows the shape. */
const Sparkline: React.FC<{ points: number[] }> = ({ points }) => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * 100},${30 - ((p - min) / span) * 28 - 1}`)
    .join(' ');
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="h-8 w-20 shrink-0 text-brand-600"
      aria-hidden="true"
    >
      <polyline
        points={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** One headline figure, its change since the comparison period, and (room allowing) its shape over time. */
export const KpiCard: React.FC<{ result: KpiResult; goodDirection?: 'up' | 'down' }> = ({
  result,
  goodDirection,
}) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const change = formatChange(result.changePct);
  const tone = changeTone(change.direction, goodDirection);
  // A narrow card keeps the figure and its change, and drops the sparkline.
  const roomForSparkline = size.width === 0 || size.width >= 210;
  return (
    <div ref={ref} className="flex h-full min-h-0 items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-2xl font-black leading-none text-slate-900">
          {formatValue(result.value, result.unit, { compact: true })}
        </p>
        <p className={`mt-1 h-4 truncate text-[11px] font-bold ${TONE_CLASS[tone]}`}>
          {change.direction !== 'none' && (
            <>
              {ARROWS[change.direction]} {change.text}{' '}
              <span className="font-medium text-slate-400">vs before</span>
            </>
          )}
        </p>
      </div>
      {roomForSparkline && result.sparkline && result.sparkline.length > 1 && (
        <Sparkline points={result.sparkline} />
      )}
    </div>
  );
};
