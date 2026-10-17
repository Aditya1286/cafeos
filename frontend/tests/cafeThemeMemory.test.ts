import { describe, it, expect } from 'vitest';
import {
  CAFE_THEMES_KEY,
  rememberCafeTheme,
  rememberedCafeTheme,
} from '../src/utils/cafeThemeMemory';

const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};
const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};
const themed = (id: string, variantId: string) => ({ enabled: true, theme: { id, variantId } });

describe('cafe theme memory', () => {
  it('remembers a themed café per slug, and nothing for one never opened', () => {
    const s = store();
    expect(rememberedCafeTheme('moon-cafe', s)).toBeNull();
    rememberCafeTheme('moon-cafe', themed('cozy-night', 'ember'), s);
    expect(rememberedCafeTheme('moon-cafe', s)).toEqual({ id: 'cozy-night', variantId: 'ember' });
    expect(rememberedCafeTheme('other-cafe', s)).toBeNull();
    expect(rememberedCafeTheme(undefined, s)).toBeNull();
  });

  it('matches the slug case-insensitively', () => {
    const s = store();
    rememberCafeTheme('Moon-Cafe', themed('warm-classic', 'olive'), s);
    expect(rememberedCafeTheme('moon-cafe', s)).toEqual({ id: 'warm-classic', variantId: 'olive' });
  });

  it('stores the resolved look: an unknown variant becomes the theme’s first variant', () => {
    const s = store();
    rememberCafeTheme('moon-cafe', themed('modern-minimal', 'retired-variant'), s);
    expect(rememberedCafeTheme('moon-cafe', s)).toEqual({ id: 'modern-minimal', variantId: 'sage' });
  });

  it('forgets a café that is unthemed, off, or on the default look', () => {
    const s = store();
    for (const identity of [
      { enabled: false, theme: { id: 'cozy-night', variantId: 'amber' } },
      { enabled: true, theme: null },
      { enabled: true, theme: { id: 'retired-theme', variantId: 'x' } },
      null,
      undefined,
    ]) {
      rememberCafeTheme('moon-cafe', themed('cozy-night', 'amber'), s);
      expect(rememberedCafeTheme('moon-cafe', s)).not.toBeNull();
      rememberCafeTheme('moon-cafe', identity, s);
      expect(rememberedCafeTheme('moon-cafe', s)).toBeNull();
    }
  });

  it('ignores corrupt or hostile stored data', () => {
    for (const raw of ['not json', '[]', 'null', '{"moon-cafe":{"id":5}}', '{"moon-cafe":{"id":"<x>","variantId":"a"}}']) {
      expect(rememberedCafeTheme('moon-cafe', store({ [CAFE_THEMES_KEY]: raw }))).toBeNull();
    }
  });

  it('keeps only the most recent cafés', () => {
    const s = store();
    for (let i = 0; i < 25; i++) rememberCafeTheme(`cafe-${i}`, themed('cozy-night', 'amber'), s);
    expect(rememberedCafeTheme('cafe-0', s)).toBeNull();
    expect(rememberedCafeTheme('cafe-24', s)).not.toBeNull();
  });

  it('tolerates throwing or missing storage', () => {
    expect(() => rememberCafeTheme('moon-cafe', themed('cozy-night', 'amber'), throwing)).not.toThrow();
    expect(rememberedCafeTheme('moon-cafe', throwing)).toBeNull();
    expect(() => rememberCafeTheme('moon-cafe', themed('cozy-night', 'amber'), null)).not.toThrow();
    expect(rememberedCafeTheme('moon-cafe', null)).toBeNull();
  });
});
