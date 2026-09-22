import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, DollarSign, Users, AlertTriangle, ChevronDown } from 'lucide-react';
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
  const [collapsed, setCollapsed] = useState(false);
  const todayOrders = metrics?.todayOrdersCount ?? 0;
  const occupancyPct = totalTables ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const cards = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-5">
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

  return (
    <div>
      {/* Mobile-only: collapse the KPI tiles to reclaim vertical space above the fold —
          desktop always shows the full grid, no toggle needed there. */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="sm:hidden w-full flex items-center justify-between px-1 pb-2"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Overview</span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
          {collapsed ? 'Show' : 'Hide'}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </span>
      </button>

      <div className="hidden sm:block">{cards}</div>

      <div className="sm:hidden">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {cards}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KpiStatsGrid;
