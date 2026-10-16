import React from 'react';
import { Flame, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { StatCardProps } from '@/molecules/StatCard';
import { DashboardMetrics } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils/money';
import { INVENTORY_ENABLED } from '@/constants/features';
import { KpiStatsGridDesktop } from './KpiStatsGridDesktop';
import { KpiStatsGridMobile } from './KpiStatsGridMobile';

// Every card shares the accent tile; colour is reserved for status (see the Running Low card).
const BRAND_TILE = 'bg-gradient-to-br from-brand-500 to-brand-600';

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
      color: 'text-slate-900',
      iconBg: BRAND_TILE,
      border: 'border-slate-200/80',
    },
    {
      icon: DollarSign,
      label: "Today's Sales",
      value: formatCurrency(metrics?.todaySalesPaise),
      subtext: `${todayOrders} order${todayOrders === 1 ? '' : 's'} today`,
      trend: `${formatPercentage(metrics?.salesTrendPercentage ?? null)} vs last week`,
      color: 'text-slate-900',
      iconBg: BRAND_TILE,
      border: 'border-slate-200/80',
    },
    {
      icon: Users,
      label: 'Tables in Use',
      value: `${occupiedTables} / ${totalTables}`,
      subtext: `${occupancyPct}% of tables taken`,
      trend: `${occupiedTables} table${occupiedTables === 1 ? '' : 's'} busy`,
      color: 'text-slate-900',
      iconBg: BRAND_TILE,
      border: 'border-slate-200/80',
    },
    {
      icon: AlertTriangle,
      label: 'Running Low',
      value: lowStockCount,
      subtext: lowStockCount > 0 ? 'Some ingredients need restocking' : 'Stock looks fine',
      trend: lowStockCount > 0 ? 'Restock soon' : 'All good',
      // The one card that turns amber: running low is a warning, not just a number.
      color: lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900',
      iconBg: lowStockCount > 0 ? 'bg-gradient-to-br from-amber-400 to-amber-500' : BRAND_TILE,
      border: lowStockCount > 0 ? 'border-amber-200' : 'border-slate-200/80',
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
