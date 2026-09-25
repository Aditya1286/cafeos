import {
  FileText, UtensilsCrossed, QrCode, Package, BarChart3, Wallet, Settings, Flame, Undo2, LucideIcon
} from 'lucide-react';
import { INVENTORY_ENABLED } from '@/constants/features';

export type DashboardTab = 'kds' | 'orders' | 'menu' | 'tables' | 'inventory' | 'analytics' | 'ledger' | 'refunds' | 'settings';

const ALL_TABS: { id: DashboardTab; label: string; icon: LucideIcon }[] = [
  { id: 'kds',       label: 'Kitchen', icon: Flame },
  { id: 'orders',    label: 'All Orders', icon: FileText },
  { id: 'menu',      label: 'Menu', icon: UtensilsCrossed },
  { id: 'tables',    label: 'Tables & QR', icon: QrCode },
  { id: 'inventory', label: 'Inventory',   icon: Package },
  { id: 'analytics', label: 'Analytics',   icon: BarChart3 },
  { id: 'ledger',    label: 'Fees & Payments', icon: Wallet },
  { id: 'refunds',   label: 'Refunds & Cancellations', icon: Undo2 },
  { id: 'settings',  label: 'Settings', icon: Settings },
];

/** The tabs actually shown — feature-flagged sections are filtered out here, once. */
export const TABS = ALL_TABS.filter((t) => t.id !== 'inventory' || INVENTORY_ENABLED);

/** Everything the desktop and mobile header views both receive from the parent `DashboardHeader`. */
export interface HeaderViewProps {
  user: any;
  business: any;
  activeOrdersCount: number;
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  /** Count shown on a tab's badge, or null for none — computed once in the parent. */
  badgeFor: (tabId: DashboardTab) => number | null;
  copiedUrl: boolean;
  onCopyMenuUrl: () => void;
  loading: boolean;
  onRefresh: () => void;
  onAddItem: () => void;
}
