import { DashboardTab, DashboardTabDef } from '@/constants/dashboardTabs';

// The tab list itself (names, role access, feature flags) lives in constants/dashboardTabs.ts.
export type { DashboardTab, DashboardTabDef };
export { tabsForRole } from '@/constants/dashboardTabs';

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
  darkMode: boolean;
  onToggleDarkMode: () => void;
}
