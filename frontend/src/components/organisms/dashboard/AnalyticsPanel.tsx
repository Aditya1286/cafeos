import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { DailySalesPoint } from '../../../types';
import { paiseToRupees } from '../../../utils/money';

interface AnalyticsPanelProps {
  dailySales: DailySalesPoint[];
}

const tooltipStyle = {
  backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#0f172a',
  borderRadius: '12px', fontSize: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
};

/** Renders exactly what the backend's daily-sales aggregation returns — no synthetic fallback data. */
export const AnalyticsPanel = ({ dailySales }: AnalyticsPanelProps) => {
  const chartData = dailySales.map(d => ({
    day: d._id?.split('-').slice(1).join('/') || d._id,
    sales: paiseToRupees(d.salesPaise),
    orders: d.orders
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900">Financial & Sales Analytics</h2>
        <p className="text-xs text-slate-500 font-medium">Daily order volume and gross revenue metrics (last 7 days)</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900">Daily Gross Revenue (₹)</h3>
        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-2">
            <BarChart3 className="w-10 h-10 text-slate-300" />
            <p className="text-xs font-bold text-slate-400">No paid orders in the last 7 days yet</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`₹${v}`, 'Revenue']} />
                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
