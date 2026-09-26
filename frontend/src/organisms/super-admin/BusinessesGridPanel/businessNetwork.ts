import { AdminBusinessSummary } from '@/types';
import { businessHealthOf } from '@/utils/adminInsights';

export type BusinessFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'OVERDUE' | 'DEMO';

export const BUSINESS_FILTERS: { id: BusinessFilter; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'SUSPENDED', label: 'Suspended' },
  { id: 'DEMO', label: 'Demo' },
];

export const matchesBusinessFilter = (b: AdminBusinessSummary, filter: BusinessFilter): boolean => {
  switch (filter) {
    case 'ALL':
      return true;
    case 'OVERDUE':
      return b.overdueAmountPaise > 0;
    case 'DEMO':
      return !!b.isDemo;
    default:
      return b.status === filter;
  }
};

export type BusinessSort = 'attention' | 'owed' | 'newest' | 'name';

export const BUSINESS_SORTS: { id: BusinessSort; label: string }[] = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'owed', label: 'Most owed' },
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'Name A–Z' },
];

const HEALTH_RANK = { suspended: 0, overdue: 1, healthy: 2 } as const;

export const sortBusinesses = (
  list: AdminBusinessSummary[],
  sort: BusinessSort,
): AdminBusinessSummary[] => {
  const sorted = [...list];
  switch (sort) {
    case 'attention':
      // Same worst-first order as the Business Radar: suspended, then overdue (largest first).
      return sorted.sort(
        (a, b) =>
          HEALTH_RANK[businessHealthOf(a)] - HEALTH_RANK[businessHealthOf(b)] ||
          b.overdueAmountPaise - a.overdueAmountPaise ||
          b.totalCommissionOwedPaise - a.totalCommissionOwedPaise,
      );
    case 'owed':
      return sorted.sort((a, b) => b.totalCommissionOwedPaise - a.totalCommissionOwedPaise);
    case 'newest':
      return sorted.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
};

export const formatShortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : null;
