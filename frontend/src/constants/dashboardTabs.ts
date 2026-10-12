import {
  FileText,
  UtensilsCrossed,
  QrCode,
  Package,
  BarChart3,
  Wallet,
  Settings,
  Flame,
  Undo2,
  Users,
  UserCircle,
  LucideIcon,
} from 'lucide-react';
import { INVENTORY_ENABLED, FEES_AND_PAYMENTS_ENABLED } from '@/constants/features';

// The owner dashboard's tabs, in one place: what each tab is called, which roles may open it, which
// feature flag (if any) switches it off, and where it appears. The header bar, the mobile menu, and
// the page that decides what to render all read this table (tabsForRole / resolveVisibleTab), so
// adding or restricting a tab is one edit here. The backend enforces the same access per route
// (restrictTo); this only decides what the UI offers.

type Role = 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'INVENTORY_MANAGER' | 'STAFF';

// Kitchen staff (STAFF) work orders: the live Kitchen board plus the full order list, and can look up
// (not change) the tables and their QR codes. Every other role keeps the full dashboard.
const EVERYONE: Role[] = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'INVENTORY_MANAGER', 'STAFF'];
const NOT_KITCHEN_STAFF: Role[] = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'INVENTORY_MANAGER'];
const OWNER_ONLY: Role[] = ['OWNER'];

export const DASHBOARD_TAB_IDS = [
  'kds',
  'orders',
  'menu',
  'tables',
  'inventory',
  'analytics',
  'ledger',
  'refunds',
  'staff',
  'settings',
  'profile',
] as const;

export type DashboardTab = (typeof DASHBOARD_TAB_IDS)[number];

export interface DashboardTabDef {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
  /** Roles that may open this tab. */
  roles: Role[];
  /** False while the feature is switched off (constants/features.ts): the tab is offered to no one. */
  enabled: boolean;
  /** 'bar' shows in the tab row; 'menu' is reached from the avatar's account menu instead. */
  placement: 'bar' | 'menu';
}

export const DASHBOARD_TABS: DashboardTabDef[] = [
  { id: 'kds', label: 'Kitchen', icon: Flame, roles: EVERYONE, enabled: true, placement: 'bar' },
  {
    id: 'orders',
    label: 'All Orders',
    icon: FileText,
    roles: EVERYONE,
    enabled: true,
    placement: 'bar',
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: UtensilsCrossed,
    roles: NOT_KITCHEN_STAFF,
    enabled: true,
    placement: 'bar',
  },
  {
    id: 'tables',
    label: 'Tables & QR',
    icon: QrCode,
    roles: EVERYONE,
    enabled: true,
    placement: 'bar',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    roles: NOT_KITCHEN_STAFF,
    enabled: INVENTORY_ENABLED,
    placement: 'bar',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: NOT_KITCHEN_STAFF,
    enabled: true,
    placement: 'bar',
  },
  {
    id: 'ledger',
    label: 'Fees & Payments',
    icon: Wallet,
    roles: NOT_KITCHEN_STAFF,
    enabled: FEES_AND_PAYMENTS_ENABLED,
    placement: 'bar',
  },
  {
    id: 'refunds',
    label: 'Refunds & Cancellations',
    icon: Undo2,
    roles: NOT_KITCHEN_STAFF,
    enabled: true,
    placement: 'bar',
  },
  { id: 'staff', label: 'Staff', icon: Users, roles: OWNER_ONLY, enabled: true, placement: 'bar' },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: NOT_KITCHEN_STAFF,
    enabled: true,
    placement: 'bar',
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    roles: EVERYONE,
    enabled: true,
    placement: 'menu',
  },
];

export const DEFAULT_DASHBOARD_TAB: DashboardTab = 'kds';

const mayOpen = (tab: DashboardTabDef, role: string | undefined) =>
  tab.enabled && (role === undefined ? false : (tab.roles as string[]).includes(role));

/** The tab pills a role sees in the header bar. */
export const tabsForRole = (role: string | undefined): DashboardTabDef[] =>
  DASHBOARD_TABS.filter((t) => t.placement === 'bar' && mayOpen(t, role));

/** Whether a role may open a tab at all, including the ones reached from the account menu. */
export const canOpenTab = (role: string | undefined, tabId: string): boolean =>
  DASHBOARD_TABS.some((t) => t.id === tabId && mayOpen(t, role));

/**
 * The tab to actually show: the requested one if this role may open it, otherwise the Kitchen.
 * Everything the dashboard renders or fetches per tab keys off this, never the raw requested tab, so
 * a stale or tampered tab can't show a section the role isn't allowed.
 */
export const resolveVisibleTab = (
  role: string | undefined,
  requested: DashboardTab,
): DashboardTab => (canOpenTab(role, requested) ? requested : DEFAULT_DASHBOARD_TAB);
