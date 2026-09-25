import React from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Activity, Zap } from 'lucide-react';
import NumberTicker from '@/atoms/NumberTicker';
import { SuperAdminMetrics } from '@/types';
import { KpiOverviewBentoDesktop } from './KpiOverviewBentoDesktop';
import { KpiOverviewBentoMobile } from './KpiOverviewBentoMobile';
import { KpiTile } from './types';

interface KpiOverviewBentoProps {
  metrics: SuperAdminMetrics | null;
}

/** Every figure is a real backend aggregation from `/admin/overview` — the commission badge is
 * the actual realized rate (fees ÷ GMV), not a hardcoded plan percentage. Builds the tiles once
 * and renders both the desktop bento and the compact mobile grid; CSS picks one at `md`. */
export const KpiOverviewBento = ({ metrics }: KpiOverviewBentoProps) => {
  const totalGMVPaise = metrics?.totalGMVPaise ?? 0;
  const totalPlatformFeesPaise = metrics?.totalPlatformFeesPaise ?? 0;
  const effectiveFeePercentage = totalGMVPaise > 0 ? Math.round((totalPlatformFeesPaise / totalGMVPaise) * 1000) / 10 : null;
  const feeRateLabel = effectiveFeePercentage !== null ? `${effectiveFeePercentage}% of sales` : 'No sales yet';

  const tiles: KpiTile[] = [
    {
      key: 'gmv',
      value: <NumberTicker value={totalGMVPaise / 100} prefix="₹" />,
      label: 'Total Sales',
      description: 'Money from all paid orders across every business',
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
    },
    {
      key: 'orders',
      value: <NumberTicker value={metrics?.totalOrders ?? 0} />,
      label: `Orders · ${metrics?.paidOrders ?? 0} paid`,
      description: `Total orders placed · ${metrics?.paidOrders ?? 0} paid`,
      icon: <ShoppingBag className="w-5 h-5 text-blue-600" />,
    },
    {
      key: 'aov',
      value: <NumberTicker value={Math.round((metrics?.avgOrderValuePaise ?? 0) / 100)} prefix="₹" />,
      label: 'Average order',
      description: 'How much a customer spends per paid order, on average',
      icon: <TrendingUp className="w-5 h-5 text-amber-600" />,
    },
    {
      key: 'fees',
      value: <NumberTicker value={totalPlatformFeesPaise / 100} prefix="₹" />,
      label: `Our fees · ${feeRateLabel}`,
      description: 'Fees we have earned from completed orders',
      icon: <Activity className="w-5 h-5 text-red-600" />,
      badge: (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-extrabold border border-red-200">
          <Zap className="w-3 h-3" /> {feeRateLabel}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="md:hidden">
        <KpiOverviewBentoMobile tiles={tiles} />
      </div>
      <div className="hidden md:block">
        <KpiOverviewBentoDesktop tiles={tiles} />
      </div>
    </>
  );
};

export default KpiOverviewBento;
