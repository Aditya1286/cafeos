import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Download } from 'lucide-react';
import EmptyState from '../../ui/EmptyState';
import { adminTooltipStyle, paymentMethodColors } from '../../../constants/chartTheme';
import { formatCurrency } from '../../../utils/money';
import { SuperAdminMetrics, PaymentMethodBreakdownPoint } from '../../../types';

interface PlatformAnalyticsPanelProps {
  metrics: SuperAdminMetrics | null;
  activeBusinessesCount: number;
  totalBusinessesCount: number;
  paymentMethodBreakdown: PaymentMethodBreakdownPoint[];
  onExportCsv: () => void;
}

export const PlatformAnalyticsPanel = ({ metrics, activeBusinessesCount, totalBusinessesCount, paymentMethodBreakdown, onExportCsv }: PlatformAnalyticsPanelProps) => {
  const totalGMVPaise = metrics?.totalGMVPaise ?? 0;
  const totalPlatformFeesPaise = metrics?.totalPlatformFeesPaise ?? 0;
  const effectiveFeePercentage = totalGMVPaise > 0 ? Math.round((totalPlatformFeesPaise / totalGMVPaise) * 1000) / 10 : null;

  const totalBreakdownAmount = paymentMethodBreakdown.reduce((acc, pm) => acc + pm.amountPaise, 0);

  const cards = [
    {
      label: 'Total Platform GMV',
      value: formatCurrency(totalGMVPaise),
      sub: `${metrics?.paidOrders ?? 0} paid orders`,
      subColor: 'text-slate-400',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Platform Fee Revenue',
      value: formatCurrency(totalPlatformFeesPaise),
      sub: effectiveFeePercentage !== null ? `${effectiveFeePercentage}% of GMV` : 'No GMV yet',
      subColor: 'text-slate-400',
      valueColor: 'text-emerald-600',
    },
    {
      label: 'Registered Outlets',
      value: `${totalBusinessesCount} Outlets`,
      sub: `${activeBusinessesCount} active`,
      subColor: 'text-slate-400',
      valueColor: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div className="text-xs text-slate-400 font-bold uppercase">{card.label}</div>
            <div className={`text-3xl font-black ${card.valueColor}`}>{card.value}</div>
            <div className={`text-xs font-bold ${card.subColor}`}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">
            Payment Method Breakdown Analytics
          </h3>
          <button
            onClick={onExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4" /> Download Raw Data
          </button>
        </div>

        {paymentMethodBreakdown.length === 0 ? (
          <EmptyState
            title="No paid orders yet"
            description="Payment method breakdown will appear once orders are completed."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethodBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="amountPaise" nameKey="_id">
                    {paymentMethodBreakdown.map((entry) => (
                      <Cell key={entry._id} fill={paymentMethodColors[entry._id] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={adminTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 gap-3 self-center">
              {paymentMethodBreakdown.map((pm) => {
                const pct = totalBreakdownAmount > 0 ? Math.round((pm.amountPaise / totalBreakdownAmount) * 100) : 0;
                return (
                  <div key={pm._id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-bold">{pm._id} ({pm.count} orders)</div>
                      <div className="text-lg font-extrabold text-slate-900">{formatCurrency(pm.amountPaise)}</div>
                    </div>
                    <div className="text-xs font-extrabold text-slate-400">{pct}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformAnalyticsPanel;
