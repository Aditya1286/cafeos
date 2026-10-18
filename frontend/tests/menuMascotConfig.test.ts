import { describe, expect, it } from 'vitest';
import { LAYOUT, MENU_CONFIG, MENU_PHONE_SIZE_SCALE } from '../src/mascot/config';

// The mascot on the guest menu must stay out of the way of ordering on a phone. Measured on the
// real page: at its full 128px, bottom-right, it covered the add button of the second column.
describe('the mascot on the menu page, on a phone', () => {
  const phoneWidthPx = LAYOUT.sizes[LAYOUT.sizes.length - 1].px;
  const phoneSizePx = phoneWidthPx * (MENU_CONFIG.phoneFlow?.sizeScale ?? 1);

  it('is small: well under half the width of a phone screen, and no bigger than 72px', () => {
    expect(MENU_PHONE_SIZE_SCALE).toBeLessThanOrEqual(0.6);
    expect(phoneSizePx).toBeLessThanOrEqual(72);
    expect(phoneSizePx).toBeGreaterThanOrEqual(48); // still recognisable
  });

  it('rests in the left corner, clear of the add buttons at the right of each menu item', () => {
    expect(MENU_CONFIG.phoneFlow?.mode).toBe('dock');
    expect(MENU_CONFIG.phoneFlow?.corner).toBe('left');
  });

  it('keeps its bigger size on larger screens', () => {
    expect(MENU_CONFIG.flow?.sizeScale).toBeUndefined();
    expect(MENU_CONFIG.flow?.corner).toBeUndefined();
  });

  it('stays above the cart bar', () => {
    expect(MENU_CONFIG.flow?.insets?.bottom).toBeGreaterThanOrEqual(76);
  });
});
