import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  readKitchenMode,
  writeKitchenMode,
} from '../src/organisms/dashboard/KitchenKdsBoard/kitchenMode';
import { KDS_KITCHEN_MODE_KEY } from '../src/constants/kitchen';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

describe('kitchen mode preference', () => {
  it('uses the default when nothing has been chosen yet (staff default on, owners off)', () => {
    expect(readKitchenMode(true, fakeStorage())).toBe(true);
    expect(readKitchenMode(false, fakeStorage())).toBe(false);
  });

  it('remembers an explicit choice over the default, in both directions', () => {
    const store = fakeStorage();
    writeKitchenMode(false, store);
    expect(readKitchenMode(true, store)).toBe(false); // a staff member who turned it off stays off
    writeKitchenMode(true, store);
    expect(readKitchenMode(false, store)).toBe(true);
    expect(store.data[KDS_KITCHEN_MODE_KEY]).toBe('1');
  });

  it('ignores a corrupt stored value', () => {
    expect(readKitchenMode(true, fakeStorage({ [KDS_KITCHEN_MODE_KEY]: 'banana' }))).toBe(true);
    expect(readKitchenMode(false, fakeStorage({ [KDS_KITCHEN_MODE_KEY]: '' }))).toBe(false);
  });

  it('never throws when storage is blocked or missing (private window, blocked site data)', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readKitchenMode(true, blocked)).toBe(true);
    expect(() => writeKitchenMode(true, blocked)).not.toThrow();
    expect(readKitchenMode(false, null)).toBe(false);
    expect(() => writeKitchenMode(true, null)).not.toThrow();
  });
});

// The ragged look this guards against: tickets that size to their content and then stretch to match
// their row partner, so heights jump from row to row and action buttons float mid-card. The layout
// was verified in a browser (every ticket exactly the same height, button 13px from the bottom);
// this keeps the rule from being quietly undone.
describe('Kitchen mode ticket layout', () => {
  const src = readFileSync(
    join(__dirname, '../src/organisms/dashboard/KitchenKdsBoard/KdsWallTicket.tsx'),
    'utf8',
  );

  it('gives every ticket one fixed height', () => {
    expect(src).toMatch(/const TICKET_HEIGHT = 'h-\[21rem\]'/);
    expect(src).toMatch(/expanded \? '[^']*' : TICKET_HEIGHT/); // only the tapped-open copy is free-height
    expect(src).not.toMatch(/\bmin-h-\[\d+rem\]/); // a minimum would let tickets grow past it
  });

  it('keeps the footer out of the scrolling item list, so buttons sit in the same place on every card', () => {
    // Header, order line, note and footer are shrink-0; only the item list flexes and scrolls.
    const shrinkRows = src.match(/shrink-0/g) ?? [];
    expect(shrinkRows.length).toBeGreaterThanOrEqual(5);
    expect(src).toMatch(/flex-1 min-h-0/);
    expect(src).toMatch(/overflow-y-auto/);
  });

  it('never hides items silently: it cues overflow and always states the item count', () => {
    expect(src).toMatch(/kds-more-items/);
    expect(src).toMatch(/itemCount/);
  });
});

describe('tap to expand', () => {
  const src = readFileSync(
    join(__dirname, '../src/organisms/dashboard/KitchenKdsBoard/KdsWallTicket.tsx'),
    'utf8',
  );

  it('opens the full ticket from the item list, by tap or keyboard', () => {
    expect(src).toMatch(/onClick: onExpand/);
    expect(src).toMatch(/e\.key === 'Enter' \|\| e\.key === ' '/);
  });

  it('closes on Esc without also leaving Kitchen mode, and swallows a double-tap', () => {
    expect(src).toMatch(/addEventListener\('keydown', onKey, true\)/); // capture: runs before Kitchen mode's
    expect(src).toMatch(/useClickGuard\(500, true\)/);
  });
});
