import { describe, it, expect } from 'vitest';
import {
  DASHBOARD_TABS,
  canOpenTab,
  resolveVisibleTab,
  tabsForRole,
} from '../src/constants/dashboardTabs';

const ids = (role: string | undefined) => tabsForRole(role).map((t) => t.id);

describe('dashboard tabs', () => {
  it('shows the owner every enabled tab in the bar, in order, and the profile only via the menu', () => {
    // Inventory and Fees & Payments are switched off in constants/features.ts.
    expect(ids('OWNER')).toEqual([
      'kds',
      'orders',
      'menu',
      'tables',
      'analytics',
      'refunds',
      'staff',
      'settings',
    ]);
    expect(ids('OWNER')).not.toContain('profile');
    expect(canOpenTab('OWNER', 'profile')).toBe(true);
  });

  it('keeps the staff tab to the owner', () => {
    for (const role of ['MANAGER', 'RECEPTIONIST', 'INVENTORY_MANAGER', 'STAFF']) {
      expect(ids(role)).not.toContain('staff');
    }
  });

  it('limits kitchen staff to the kitchen, orders and tables', () => {
    expect(ids('STAFF')).toEqual(['kds', 'orders', 'tables']);
    expect(canOpenTab('STAFF', 'settings')).toBe(false);
    expect(canOpenTab('STAFF', 'profile')).toBe(true);
  });

  it('offers no tabs to an unknown role, and never an unknown tab id', () => {
    expect(ids(undefined)).toEqual([]);
    expect(ids('NOBODY')).toEqual([]);
    expect(canOpenTab('OWNER', 'not-a-tab')).toBe(false);
  });

  it('falls back to the Kitchen when a role asks for a tab it may not open', () => {
    expect(resolveVisibleTab('STAFF', 'settings')).toBe('kds');
    expect(resolveVisibleTab('OWNER', 'settings')).toBe('settings');
    expect(resolveVisibleTab('OWNER', 'ledger')).toBe('kds'); // switched off by FEES_AND_PAYMENTS_ENABLED
  });

  it('has a unique id per tab', () => {
    const all = DASHBOARD_TABS.map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
  });
});
