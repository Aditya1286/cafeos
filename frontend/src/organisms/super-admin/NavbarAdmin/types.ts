import {
  Activity,
  Store,
  Layers,
  Server,
  BarChart3,
  Flame,
  Wallet,
  Undo2,
  LifeBuoy,
  LucideIcon,
} from 'lucide-react';

export const DATE_PRESETS = [
  { id: 'today', label: 'Today', short: 'Today' },
  { id: 'yesterday', label: 'Yesterday', short: 'Yday' },
  { id: 'last_7_days', label: 'Last 7 Days', short: '7D' },
  { id: 'last_30_days', label: 'Last 30 Days', short: '30D' },
];

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Badge count; undefined = no badge. */
  count?: number;
}

export interface NavbarAdminProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onOpenCommand: () => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExport: (format: 'csv' | 'pdf') => void;
  user?: any;
  onLogout?: () => void;
  businessesCount?: number;
  pendingRemittancesCount?: number;
  pendingSubscriptionRequestsCount?: number;
  refundsNeededCount?: number;
  openTicketsCount?: number;
}

/** What the desktop and mobile navbar views receive from the parent `NavbarAdmin`. */
export type NavbarAdminViewProps = Omit<
  NavbarAdminProps,
  | 'businessesCount'
  | 'pendingRemittancesCount'
  | 'pendingSubscriptionRequestsCount'
  | 'refundsNeededCount'
  | 'openTicketsCount'
> & {
  navItems: AdminNavItem[];
};

export const buildNavItems = ({
  businessesCount = 0,
  pendingRemittancesCount = 0,
  pendingSubscriptionRequestsCount = 0,
  refundsNeededCount = 0,
  openTicketsCount = 0,
}: Pick<
  NavbarAdminProps,
  | 'businessesCount'
  | 'pendingRemittancesCount'
  | 'pendingSubscriptionRequestsCount'
  | 'refundsNeededCount'
  | 'openTicketsCount'
>): AdminNavItem[] => [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'businesses', label: 'Businesses', icon: Store, count: businessesCount },
  {
    id: 'remittances',
    label: 'Fee Payments',
    icon: Wallet,
    count: pendingRemittancesCount || undefined,
  },
  {
    id: 'refunds',
    label: 'Refunds & Cancellations',
    icon: Undo2,
    count: refundsNeededCount || undefined,
  },
  { id: 'support', label: 'Support Tickets', icon: LifeBuoy, count: openTicketsCount || undefined },
  { id: 'analytics', label: 'Reports', icon: BarChart3 },
  { id: 'kitchen', label: 'Live Kitchens', icon: Flame },
  {
    id: 'plans',
    label: 'Plans',
    icon: Layers,
    count: pendingSubscriptionRequestsCount || undefined,
  },
  { id: 'system', label: 'Server Health', icon: Server },
];

/** Items whose badge means "work is waiting" — the always-on businesses total isn't one. */
export const ACTIONABLE_NAV_IDS = new Set(['remittances', 'refunds', 'support', 'plans']);
