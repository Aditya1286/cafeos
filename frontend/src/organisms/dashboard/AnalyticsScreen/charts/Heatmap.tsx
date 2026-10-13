import React from 'react';
import type { MatrixResult } from '@/services/dashboard/analytics/types';
import { formatValue } from '@/utils/analyticsFormat';
import { EmptyChart } from './EmptyChart';

interface HeatmapProps {
  result: MatrixResult;
  /** Which of the matrix's layers colours the cells ('orders' or 'sales'). */
  layer?: string;
  emptyMessage?: string;
}

/** A weekday × hour grid, darker where busier. The cells stretch to fill the card. */
export const Heatmap: React.FC<HeatmapProps> = ({
  result,
  layer = 'orders',
  emptyMessage = 'No orders in this period',
}) => {
  const grid = result.layers[layer] ?? Object.values(result.layers)[0] ?? [];
  const max = Math.max(...grid.flat(), 0);
  if (max <= 0) return <EmptyChart message={emptyMessage} />;
  const unit = layer === 'sales' ? 'paise' : 'count';

  return (
    <div
      className="grid h-full min-h-0 gap-[2px]"
      style={{
        gridTemplateColumns: `28px repeat(${result.cols.length}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${result.rows.length}, minmax(0, 1fr)) 14px`,
      }}
      role="img"
      aria-label={`Busy hours by weekday and hour, by ${layer}`}
    >
      {result.rows.map((day, r) => (
        <React.Fragment key={day}>
          <span className="flex items-center text-[10px] font-bold text-slate-400">{day}</span>
          {result.cols.map((hour, c) => {
            const value = grid[r]?.[c] ?? 0;
            return (
              <span
                key={hour}
                title={`${day} ${hour}: ${formatValue(value, unit)}`}
                className={`rounded-[3px] ${value === 0 ? 'bg-slate-100' : ''}`}
                style={
                  value === 0
                    ? undefined
                    : { background: `rgba(249, 115, 22, ${0.14 + 0.86 * (value / max)})` }
                }
              />
            );
          })}
        </React.Fragment>
      ))}
      <span />
      {result.cols.map((hour, c) => (
        <span
          key={hour}
          className="overflow-visible whitespace-nowrap text-[9px] font-bold text-slate-400"
        >
          {c % 3 === 0 ? hour : ''}
        </span>
      ))}
    </div>
  );
};
