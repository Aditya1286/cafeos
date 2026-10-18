import { describe, expect, it } from 'vitest';
import {
  LAYOUT,
  MENU_CONFIG,
  MENU_PEEK_HOLD_MS,
  MENU_PHONE_SIZE_SCALE,
  MENU_SIZE_SCALE,
  resolveFlow,
} from '../src/mascot/config';

// The mascot on the guest menu must stay out of the way of ordering. Measured on the real page: at
// its full 128px, docked bottom-right, it covered the add button of the second column.
describe('the mascot on the menu page', () => {
  const phoneBasePx = LAYOUT.sizes[LAYOUT.sizes.length - 1].px;
  const phoneSizePx = phoneBasePx * (resolveFlow(MENU_CONFIG, true)?.sizeScale ?? 1);

  it('is small on a phone: no bigger than 72px, still recognisable', () => {
    expect(MENU_PHONE_SIZE_SCALE).toBeLessThanOrEqual(0.6);
    expect(phoneSizePx).toBeLessThanOrEqual(72);
    expect(phoneSizePx).toBeGreaterThanOrEqual(48);
  });

  it('is small on larger screens too, not the 280px of the landing page', () => {
    for (const { px } of LAYOUT.sizes) {
      expect(px * MENU_SIZE_SCALE).toBeLessThanOrEqual(110);
    }
  });

  it('is not on screen between pop-ups, so it never sits on top of the menu', () => {
    expect(resolveFlow(MENU_CONFIG, true)?.mode).toBe('peek');
    expect(resolveFlow(MENU_CONFIG, false)?.mode).toBe('peek');
  });

  it('sinks by itself after a while, if the visitor stays where they are', () => {
    expect(MENU_PEEK_HOLD_MS).toBeGreaterThanOrEqual(5000); // long enough to read the tip
    expect(MENU_PEEK_HOLD_MS).toBeLessThanOrEqual(10000);
  });
});
