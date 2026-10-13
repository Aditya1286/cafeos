import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useElementSize } from '@/hooks/useElementSize';
import type { BreakdownResult } from '@/services/dashboard/analytics/types';
import { formatPercent, formatValue } from '@/utils/analyticsFormat';
import { colorAt } from './chartTheme';
import { EmptyChart } from './EmptyChart';

const LEGEND_ROW = 22;
const MIN_DONUT = 88;

/**
 * A breakdown as a donut with its legend beside it. The donut takes at most half the card's width
 * (so the legend always has room for names) and never more than its height. The legend shows as many
 * rows as fit; the rest fold into "+N more".
 */
export const DonutChart: React.FC<{ result: BreakdownResult; emptyMessage?: string }> = ({
  result,
  emptyMessage = 'No sales in this period',
}) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const slices = result.slices;
  if (slices.length === 0) return <EmptyChart message={emptyMessage} />;

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const donut = Math.max(Math.min(size.height, Math.floor(size.width * 0.5)), MIN_DONUT);
  const fit = Math.max(Math.floor(size.height / LEGEND_ROW), 2);
  const shown = slices.length <= fit ? slices : slices.slice(0, fit - 1);
  const rest = slices.slice(shown.length);

  return (
    <div ref={ref} className="flex h-full min-h-0 items-center gap-3">
      {size.height > 0 && (
        <>
          <div className="relative shrink-0" style={{ width: donut, height: donut }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {slices.map((s, i) => (
                    <Cell key={s.id} fill={colorAt(i)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatValue(value as number, result.unit),
                    String(name),
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="max-w-[60%] truncate text-sm font-black text-slate-900">
                {formatValue(total, result.unit, { compact: true })}
              </span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-0.5">
            {shown.map((s, i) => (
              <li
                key={s.id}
                title={formatValue(s.value, result.unit)}
                className="flex items-center gap-1.5 text-[11px]"
                style={{ height: LEGEND_ROW - 2 }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: colorAt(i) }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-bold text-slate-700">{s.label}</span>
                <span className="shrink-0 font-black text-slate-900">{formatPercent(s.share)}</span>
              </li>
            ))}
            {rest.length > 0 && (
              <li
                className="flex items-center gap-1.5 text-[11px] text-slate-400"
                style={{ height: LEGEND_ROW - 2 }}
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-medium">+{rest.length} more</span>
                <span className="shrink-0 font-bold">
                  {formatPercent(rest.reduce((sum, s) => sum + s.share, 0))}
                </span>
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
};
