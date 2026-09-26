import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertTriangle, Ban } from 'lucide-react';
import { adminTooltipStyle } from '@/constants/chartTheme';
import {
  CancellationStats,
  CancellationTimeseriesPoint,
  WorstBusinessByCancellation,
} from '@/types';

interface CancellationRatePanelProps {
  stats: CancellationStats | null;
  timeseries: CancellationTimeseriesPoint[];
  worstBusinesses: WorstBusinessByCancellation[];
}

const rateColor = (rate: number | null) => {
  if (rate === null) return 'text-slate-400';
  if (rate >= 15) return 'text-rose-600';
  if (rate >= 5) return 'text-amber-600';
  return 'text-emerald-600';
};

/**
 * The negative-signal counterpart to the revenue chart and best-sellers list above it — how
 * much of the platform's order volume is failing (cancelled or refunded), not just how much
 * it's making. Every number is a real aggregation over the same date range as the rest of the
 * Analytics tab; nothing here is a placeholder.
 */
export const CancellationRatePanel = ({
  stats,
  timeseries,
  worstBusinesses,
}: CancellationRatePanelProps) => {
  const chartData = timeseries.map((t) => ({
    time: t.time,
    rate: t.rate ?? 0,
    hasData: t.total > 0,
  }));

  return (
    <div className="lg:col-span-6 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Cancellation & Refund Rate</h3>
          <p className="text-xs text-slate-500 font-medium">
            Out of finished orders, how many were cancelled or refunded
          </p>
        </div>
        <Ban className="w-5 h-5 text-slate-300 shrink-0" />
      </div>

      {!stats || stats.rate === null ? (
        <p className="text-xs text-slate-400 font-medium py-6 text-center">
          No completed, cancelled, or refunded orders yet in this range.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={`text-3xl font-black ${rateColor(stats.rate)}`}>{stats.rate}%</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                {stats.cancelledCount} cancelled · {stats.refundedCount} refunded of{' '}
                {stats.totalTerminalCount} orders
              </p>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={adminTooltipStyle}
                    formatter={(value: number, _name, item: any) => [
                      item?.payload?.hasData ? `${value}%` : 'No orders',
                      'Cancel/refund rate',
                    ]}
                  />
                  <Bar dataKey="rate" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Highest rate this period (min. 3 orders)
            </span>
            {worstBusinesses.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium py-2">
                Not enough orders yet to compare businesses.
              </p>
            ) : (
              <div className="space-y-2">
                {worstBusinesses.map((b) => (
                  <div
                    key={b.businessId}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 truncate">{b.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {b.cancelled} cancelled · {b.refunded} refunded of {b.total}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-black shrink-0 flex items-center gap-1 ${rateColor(b.rate)}`}
                    >
                      {b.rate >= 15 && <AlertTriangle className="w-3.5 h-3.5" />}
                      {b.rate}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CancellationRatePanel;
