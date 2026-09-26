import React from 'react';
import { DashboardTab, HeaderViewProps } from './types';
import { DashboardHeaderDesktop } from './DashboardHeaderDesktop';
import { DashboardHeaderMobile } from './DashboardHeaderMobile';

export type { DashboardTab, DashboardTabDef } from './types';
export { tabsForRole } from './types';

interface DashboardHeaderProps extends Omit<HeaderViewProps, 'badgeFor'> {
  lowStockCount: number;
  refundsNeededCount?: number;
}

/** Sticky owner-dashboard header. Owns the shared derived state (tab badges) and renders both
 * the desktop and mobile views — CSS picks which one is visible at the `lg` breakpoint. */
export const DashboardHeader = ({
  lowStockCount,
  refundsNeededCount,
  ...viewProps
}: DashboardHeaderProps) => {
  const badgeFor = (tabId: DashboardTab): number | null => {
    if (tabId === 'kds') return viewProps.activeOrdersCount || null;
    if (tabId === 'inventory') return lowStockCount || null;
    if (tabId === 'refunds') return refundsNeededCount || null;
    return null;
  };

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-xl">
      <div className="hidden lg:block">
        <DashboardHeaderDesktop {...viewProps} badgeFor={badgeFor} />
      </div>
      <div className="lg:hidden">
        <DashboardHeaderMobile {...viewProps} badgeFor={badgeFor} />
      </div>
    </header>
  );
};

export default DashboardHeader;
