import React from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Activity, Zap } from 'lucide-react';
import BentoGrid, { BentoGridItem } from '../../ui/BentoGrid';
import NumberTicker from '../../ui/NumberTicker';
import { SuperAdminMetrics } from '../../../types';

interface KpiOverviewBentoProps {
  metrics: SuperAdminMetrics | null;
}

/** Every figure is a real backend aggregation from `/admin/overview` — the commission badge is
 * the actual realized rate (fees ÷ GMV), not a hardcoded plan percentage. */
export const KpiOverviewBento = ({ metrics }: KpiOverviewBentoProps) => {
  const totalGMVPaise = metrics?.totalGMVPaise ?? 0;
  const totalPlatformFeesPaise = metrics?.totalPlatformFeesPaise ?? 0;
  const effectiveFeePercentage = totalGMVPaise > 0 ? Math.round((totalPlatformFeesPaise / totalGMVPaise) * 1000) / 10 : null;

  return (
    <BentoGrid>
      <BentoGridItem
        title={<NumberTicker value={totalGMVPaise / 100} prefix="₹" />}
        description="Total paid order volume processed across all active businesses"
        icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
      />

      <BentoGridItem
        title={<NumberTicker value={metrics?.totalOrders ?? 0} />}
        description={`Total orders placed · ${metrics?.paidOrders ?? 0} paid`}
        icon={<ShoppingBag className="w-5 h-5 text-blue-600" />}
      />

      <BentoGridItem
        title={<NumberTicker value={Math.round((metrics?.avgOrderValuePaise ?? 0) / 100)} prefix="₹" />}
        description="Average basket spend per paid order across all active outlets"
        icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
      />

      <BentoGridItem
        title={<NumberTicker value={totalPlatformFeesPaise / 100} prefix="₹" />}
        description="Platform fee revenue accrued on completed orders"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold border border-red-200">
            <Zap className="w-3 h-3" /> {effectiveFeePercentage !== null ? `${effectiveFeePercentage}% of GMV` : 'No GMV yet'}
          </span>
        }
        icon={<Activity className="w-5 h-5 text-red-600" />}
      />
    </BentoGrid>
  );
};

export default KpiOverviewBento;
