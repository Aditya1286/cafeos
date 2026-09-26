import React from 'react';
import { NavbarAdminProps, buildNavItems } from './types';
import { NavbarAdminDesktop } from './NavbarAdminDesktop';
import { NavbarAdminMobile } from './NavbarAdminMobile';

export type { NavbarAdminProps } from './types';

/** Sticky super admin header. Builds the nav items (with their live counts) once and renders both
 * the desktop and mobile views — CSS picks which one is visible at the `lg` breakpoint. */
export const NavbarAdmin: React.FC<NavbarAdminProps> = ({
  businessesCount,
  pendingRemittancesCount,
  pendingSubscriptionRequestsCount,
  refundsNeededCount,
  openTicketsCount,
  ...viewProps
}) => {
  const navItems = buildNavItems({
    businessesCount,
    pendingRemittancesCount,
    pendingSubscriptionRequestsCount,
    refundsNeededCount,
    openTicketsCount,
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm">
      <div className="hidden lg:block">
        <NavbarAdminDesktop {...viewProps} navItems={navItems} />
      </div>
      <div className="lg:hidden">
        <NavbarAdminMobile {...viewProps} navItems={navItems} />
      </div>
    </header>
  );
};

export default NavbarAdmin;
