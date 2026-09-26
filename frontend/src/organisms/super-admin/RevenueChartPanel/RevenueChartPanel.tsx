import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { adminTooltipStyle } from '@/constants/chartTheme';
import { RevenueTimeseriesPoint } from '@/types';

interface RevenueChartPanelProps {
  chartData: RevenueTimeseriesPoint[];
  dateRange: string;
  onChangeDateRange: (range: 'today' | 'last_7_days' | 'last_30_days') => void;
}

export const RevenueChartPanel = ({
  chartData,
  dateRange,
  onChangeDateRange,
}: RevenueChartPanelProps) => (
  <div className="lg:col-span-8 bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 min-w-0">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">Sales & Fees</h3>
        <p className="text-xs text-slate-500 font-medium">
          Total sales across all businesses, and the fees we earned from them
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 self-start sm:self-auto">
        {(['today', 'last_7_days', 'last_30_days'] as const).map((range, i) => (
          <button
            key={range}
            onClick={() => onChangeDateRange(range)}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
              dateRange === range ? 'bg-white text-slate-900 shadow-sm' : ''
            }`}
          >
            {['Day', 'Week', 'Month'][i]}
          </button>
        ))}
      </div>
    </div>

    <div className="h-56 sm:h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v) => `₹${v / 1000}k`}
          />
          <Tooltip contentStyle={adminTooltipStyle} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Total Sales (₹)"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorRevenue)"
            strokeWidth={3}
          />
          <Area
            type="monotone"
            dataKey="fees"
            name="Our Fees (₹)"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorFees)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="flex items-center gap-6 text-xs font-semibold text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-1 bg-red-500 rounded-full inline-block" /> Total Sales
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block" /> Our Fees
      </span>
    </div>
  </div>
);

export default RevenueChartPanel;
