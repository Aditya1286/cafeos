import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useElementSize } from '@/hooks/useElementSize';
import type { SeriesResult } from '@/services/dashboard/analytics/types';
import { formatValue } from '@/utils/analyticsFormat';
import { colorAt } from './chartTheme';
import { EmptyChart } from './EmptyChart';

interface TimeSeriesChartProps {
  result: SeriesResult;
  /** 'barLine': the first series as bars, the rest as lines on the right-hand axis. */
  variant?: 'line' | 'bar' | 'stackedBar' | 'barLine';
  /** Give the second series its own right-hand axis (different units always get one). */
  dualAxis?: boolean;
  emptyMessage?: string;
}

/** Room for the largest tick label of a unit ("₹40,000" needs more than "80"). */
const axisWidth = (unit: string): number => (unit === 'paise' ? 58 : unit === 'seconds' ? 46 : 36);

/**
 * Any series metric as lines or bars. The previous period (when asked for) is drawn as a faint
 * dashed line under the current one. A card too small for axes and a legend drops them.
 */
export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  result,
  variant = 'line',
  dualAxis = false,
  emptyMessage = 'No activity in this period',
}) => {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const compact = size.height > 0 && (size.height < 150 || size.width < 240);

  const empty = result.series.every((s) => s.points.every((p) => !p));
  if (empty) return <EmptyChart message={emptyMessage} />;

  const data = result.buckets.map((bucket, i) => {
    const row: Record<string, string | number | null> = { label: bucket.label };
    for (const s of result.series) {
      row[s.id] = s.points[i] ?? null;
      if (s.previousPoints) row[`${s.id}__before`] = s.previousPoints[i] ?? null;
    }
    return row;
  });

  const first = result.series[0];
  const axisOf = (i: number): 'left' | 'right' =>
    i > 0 && (dualAxis || variant === 'barLine' || result.series[i].unit !== first.unit)
      ? 'right'
      : 'left';
  const hasRight = result.series.some((_, i) => axisOf(i) === 'right');
  const rightUnit = result.series.find((_, i) => axisOf(i) === 'right')?.unit;
  const hasPrevious = variant === 'line' && result.series.some((s) => s.previousPoints);

  const labelOf = (key: string): string => {
    const isBefore = key.endsWith('__before');
    const s = result.series.find((x) => x.id === (isBefore ? key.slice(0, -8) : key));
    return s ? (isBefore ? `${s.label} (before)` : s.label) : key;
  };
  const unitOf = (key: string) =>
    result.series.find((x) => x.id === key.replace('__before', ''))?.unit ?? 'count';

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!compact && (
        <ul className="mb-1 flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-bold text-slate-500">
          {result.series.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorAt(i) }}
                aria-hidden="true"
              />
              {s.label}
            </li>
          ))}
          {hasPrevious && (
            <li className="flex items-center gap-1 font-medium text-slate-400">
              <span className="w-3 border-t-2 border-dashed border-slate-300" aria-hidden="true" />
              before
            </li>
          )}
        </ul>
      )}
      <div ref={ref} className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={compact ? 40 : 18}
              hide={compact && data.length > 12}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              width={compact ? 0 : axisWidth(first.unit)}
              hide={compact}
              tickFormatter={(v) => formatValue(v, first.unit, { compact: true })}
            />
            {hasRight && rightUnit && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={compact ? 0 : axisWidth(rightUnit)}
                hide={compact}
                tickFormatter={(v) => formatValue(v, rightUnit, { compact: true })}
              />
            )}
            <Tooltip
              formatter={(value: any, name: any) => [
                formatValue(value as number | null, unitOf(String(name))),
                labelOf(String(name)),
              ]}
            />
            {result.series.map((s, i) =>
              variant === 'line' || (variant === 'barLine' && i > 0) ? (
                <React.Fragment key={s.id}>
                  {s.previousPoints && variant === 'line' && (
                    <Line
                      yAxisId={axisOf(i)}
                      type="monotone"
                      dataKey={`${s.id}__before`}
                      stroke={colorAt(i)}
                      strokeOpacity={0.4}
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    yAxisId={axisOf(i)}
                    type="monotone"
                    dataKey={s.id}
                    stroke={colorAt(i)}
                    strokeWidth={2.5}
                    dot={variant === 'barLine' ? { r: 2.5 } : false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </React.Fragment>
              ) : (
                <Bar
                  key={s.id}
                  yAxisId={axisOf(i)}
                  dataKey={s.id}
                  fill={colorAt(i)}
                  fillOpacity={variant === 'barLine' ? 0.55 : 1}
                  stackId={variant === 'stackedBar' ? 'stack' : undefined}
                  radius={variant === 'stackedBar' ? 0 : [3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
