import { describe, it, expect } from 'vitest';
import { hexToChannels } from '../src/utils/theme';
import { BRAND_SHADES, DEFAULT_BRAND_PALETTE } from '../src/constants/theme';

describe('theme helpers', () => {
  it('turns hex colours into the "r g b" form the CSS variables use', () => {
    expect(hexToChannels('#dc2626')).toBe('220 38 38');
    expect(hexToChannels('DC2626')).toBe('220 38 38');
    expect(hexToChannels('#d26')).toBe('221 34 102');
    expect(hexToChannels('not-a-colour')).toBeNull();
    expect(hexToChannels('#12345')).toBeNull();
  });

  it('has every shade in the default palette, and index.css declares the same values', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
    for (const shade of BRAND_SHADES) {
      expect(DEFAULT_BRAND_PALETTE[shade]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
      expect(css).toContain(`--brand-${shade}: ${DEFAULT_BRAND_PALETTE[shade]};`);
    }
  });
});
