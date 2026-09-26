import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { DashboardAnalytics } from '@/types';
import { paiseToRupees } from '@/utils/money';
import { RepeatCustomerBar } from '@/molecules/RepeatCustomerBar';
import { ItemMarginTable } from '@/molecules/ItemMarginTable';
import { KitchenSpeedPanel } from '@/molecules/KitchenSpeedPanel';
import { INVENTORY_ENABLED } from '@/constants/features';

interface AnalyticsPanelProps {
  analytics: DashboardAnalytics | null;
}

const tooltipStyle = {
  backgroundColor: '#fff',
  borderColor: '#e2e8f0',
  color: '#0f172a',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
};

/** Renders exactly what the backend's aggregations return — no synthetic fallback data. */
export const AnalyticsPanel = ({ analytics }: AnalyticsPanelProps) => {
  const chartData = (analytics?.dailySales || []).map((d) => ({
    day: d._id?.split('-').slice(1).join('/') || d._id,
    sales: paiseToRupees(d.salesPaise),
    orders: d.orders,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900">Sales Report</h2>
        <p className="text-xs text-slate-500 font-medium">
          Orders and money earned each day (last 7 days)
        </p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900">Sales per Day (₹)</h3>
        {chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-2">
            <BarChart3 className="w-10 h-10 text-slate-300" />
            <p className="text-xs font-bold text-slate-400">
              No paid orders in the last 7 days yet
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`₹${v}`, 'Sales']} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f97316"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Returning Customers</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              How many customers come back, and how much they spend
            </p>
          </div>
          {analytics ? <RepeatCustomerBar stats={analytics.repeatCustomers} /> : null}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">How Fast Orders Are Ready</h3>
            <p className="text-[11px] text-slate-500 font-medium">Based on your real orders</p>
          </div>
          {analytics ? <KitchenSpeedPanel stats={analytics.kitchenSpeed} /> : null}
        </div>
      </div>

      {INVENTORY_ENABLED && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Profit per Item</h3>
            <p className="text-[11px] text-slate-500 font-medium">
              What each item sells for vs. what its ingredients cost
            </p>
          </div>
          {analytics ? <ItemMarginTable data={analytics.itemMargins} /> : null}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPanel;
