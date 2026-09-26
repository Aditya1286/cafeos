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
import { INVENTORY_ENABLED } from '@/constants/features';

export type DashboardTab =
  | 'kds'
  | 'orders'
  | 'menu'
  | 'tables'
  | 'inventory'
  | 'analytics'
  | 'ledger'
  | 'refunds'
  | 'staff'
  | 'settings'
  | 'profile';

export interface DashboardTabDef {
  id: DashboardTab;
  label: string;
  icon: LucideIcon;
}

const ALL_TABS: DashboardTabDef[] = [
  { id: 'kds', label: 'Kitchen', icon: Flame },
  { id: 'orders', label: 'All Orders', icon: FileText },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'tables', label: 'Tables & QR', icon: QrCode },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'ledger', label: 'Fees & Payments', icon: Wallet },
  { id: 'refunds', label: 'Refunds & Cancellations', icon: Undo2 },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'My Profile', icon: UserCircle },
];

// Kitchen staff work orders: the live Kitchen board plus the full order list. The staff list is
// the owner's alone. Every other role keeps the full dashboard it always had.
const STAFF_TABS: DashboardTab[] = ['kds', 'orders'];
const OWNER_ONLY_TABS: DashboardTab[] = ['staff'];
// Reached from the avatar's account menu rather than the tab row.
const MENU_ONLY_TABS: DashboardTab[] = ['profile'];

/** The tab pills a given role sees — feature-flagged sections are filtered out here too, once. */
export const tabsForRole = (role: string | undefined): DashboardTabDef[] =>
  ALL_TABS.filter((t) => {
    if (MENU_ONLY_TABS.includes(t.id)) return false;
    if (t.id === 'inventory' && !INVENTORY_ENABLED) return false;
    if (role === 'STAFF') return STAFF_TABS.includes(t.id);
    if (OWNER_ONLY_TABS.includes(t.id)) return role === 'OWNER';
    return true;
  });

/** Everything the desktop and mobile header views both receive from the parent `DashboardHeader`. */
export interface HeaderViewProps {
  user: any;
  business: any;
  activeOrdersCount: number;
  /** Tabs this user may see (tabsForRole). */
  tabs: DashboardTabDef[];
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  /** Count shown on a tab's badge, or null for none — computed once in the parent. */
  badgeFor: (tabId: DashboardTab) => number | null;
  copiedUrl: boolean;
  onCopyMenuUrl: () => void;
  loading: boolean;
  onRefresh: () => void;
  /** Omitted for users who can't add menu items — the button is hidden then. */
  onAddItem?: () => void;
  /** Opens the user's own profile settings (from the avatar's account menu). */
  onOpenProfile: () => void;
}
