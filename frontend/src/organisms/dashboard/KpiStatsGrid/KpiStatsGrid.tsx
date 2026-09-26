import React from 'react';
import { Flame, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { StatCardProps } from '@/molecules/StatCard';
import { DashboardMetrics } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils/money';
import { INVENTORY_ENABLED } from '@/constants/features';
import { KpiStatsGridDesktop } from './KpiStatsGridDesktop';
import { KpiStatsGridMobile } from './KpiStatsGridMobile';

interface KpiStatsGridProps {
  activeOrdersCount: number;
  occupiedTables: number;
  totalTables: number;
  lowStockCount: number;
  metrics: DashboardMetrics | null;
}

/**
 * Builds the four KPI cards once and renders both the desktop and mobile views — CSS picks
 * which one is visible at the `sm` breakpoint. Every value and trend here comes straight from
 * live order/table/inventory data or the backend's `/analytics/dashboard` aggregation — none
 * of it is a hardcoded placeholder.
 */
export const KpiStatsGrid = ({
  activeOrdersCount,
  occupiedTables,
  totalTables,
  lowStockCount,
  metrics,
}: KpiStatsGridProps) => {
  const todayOrders = metrics?.todayOrdersCount ?? 0;
  const occupancyPct = totalTables ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const allCards: StatCardProps[] = [
    {
      icon: Flame,
      label: 'Orders in Kitchen',
      value: activeOrdersCount,
      subtext: 'Being prepared now',
      trend: todayOrders > 0 ? `${activeOrdersCount} of ${todayOrders} today` : 'No orders yet',
      color: 'text-purple-600',
      iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      border: 'border-purple-200/80',
    },
    {
      icon: DollarSign,
      label: "Today's Sales",
      value: formatCurrency(metrics?.todaySalesPaise),
      subtext: `${todayOrders} order${todayOrders === 1 ? '' : 's'} today`,
      trend: `${formatPercentage(metrics?.salesTrendPercentage ?? null)} vs last week`,
      color: 'text-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      border: 'border-emerald-200/80',
    },
    {
      icon: Users,
      label: 'Tables in Use',
      value: `${occupiedTables} / ${totalTables}`,
      subtext: `${occupancyPct}% of tables taken`,
      trend: `${occupiedTables} table${occupiedTables === 1 ? '' : 's'} busy`,
      color: 'text-blue-600',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      border: 'border-blue-200/80',
    },
    {
      icon: AlertTriangle,
      label: 'Running Low',
      value: lowStockCount,
      subtext: lowStockCount > 0 ? 'Some ingredients need restocking' : 'Stock looks fine',
      trend: lowStockCount > 0 ? 'Restock soon' : 'All good',
      color: lowStockCount > 0 ? 'text-rose-600' : 'text-slate-600',
      iconBg:
        lowStockCount > 0
          ? 'bg-gradient-to-br from-rose-500 to-red-600'
          : 'bg-gradient-to-br from-slate-600 to-slate-700',
      border: lowStockCount > 0 ? 'border-rose-200/80' : 'border-slate-200/80',
    },
  ];
  const cards = INVENTORY_ENABLED ? allCards : allCards.filter((c) => c.label !== 'Running Low');

  return (
    <div>
      <div className="hidden sm:block">
        <KpiStatsGridDesktop cards={cards} />
      </div>
      <div className="sm:hidden">
        <KpiStatsGridMobile cards={cards} />
      </div>
    </div>
  );
};

export default KpiStatsGrid;
