import React from 'react';
import { Flame, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/molecules/StatCard';
import { DashboardMetrics } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils/money';

interface KpiStatsGridProps {
  activeOrdersCount: number;
  occupiedTables: number;
  totalTables: number;
  lowStockCount: number;
  metrics: DashboardMetrics | null;
}

/**
 * Every value and trend here comes straight from live order/table/inventory
 * data or the backend's `/analytics/dashboard` aggregation — none of it is a
 * hardcoded placeholder.
 */
export const KpiStatsGrid = ({ activeOrdersCount, occupiedTables, totalTables, lowStockCount, metrics }: KpiStatsGridProps) => {
  const todayOrders = metrics?.todayOrdersCount ?? 0;
  const occupancyPct = totalTables ? Math.round((occupiedTables / totalTables) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
      <StatCard
        icon={Flame}
        label="Active KDS Orders"
        value={activeOrdersCount}
        subtext="Orders in kitchen queue"
        trend={todayOrders > 0 ? `${activeOrdersCount} of ${todayOrders} today` : 'No orders yet'}
        color="text-purple-600"
        iconBg="bg-gradient-to-br from-purple-500 to-indigo-600"
        border="border-purple-200/80"
      />

      <StatCard
        icon={DollarSign}
        label="Today Total Sales"
        value={formatCurrency(metrics?.todaySalesPaise)}
        subtext={`${todayOrders} order${todayOrders === 1 ? '' : 's'} today`}
        trend={`${formatPercentage(metrics?.salesTrendPercentage ?? null)} vs last wk`}
        color="text-emerald-600"
        iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
        border="border-emerald-200/80"
      />

      <StatCard
        icon={Users}
        label="Table Floor Occupancy"
        value={`${occupiedTables} / ${totalTables}`}
        subtext={`${occupancyPct}% seating occupied`}
        trend={`${occupiedTables} active table${occupiedTables === 1 ? '' : 's'}`}
        color="text-blue-600"
        iconBg="bg-gradient-to-br from-blue-500 to-cyan-600"
        border="border-blue-200/80"
      />

      <StatCard
        icon={AlertTriangle}
        label="Low Stock Alerts"
        value={lowStockCount}
        subtext={lowStockCount > 0 ? 'Ingredients restock needed' : 'All stock levels healthy'}
        trend={lowStockCount > 0 ? 'Restock Soon' : 'Healthy'}
        color={lowStockCount > 0 ? 'text-rose-600' : 'text-slate-600'}
        iconBg={lowStockCount > 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-slate-600 to-slate-700'}
        border={lowStockCount > 0 ? 'border-rose-200/80' : 'border-slate-200/80'}
      />
    </div>
  );
};

export default KpiStatsGrid;
