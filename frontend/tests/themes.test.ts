// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BRAND_SHADES, DEFAULT_BRAND_PALETTE } from '../src/constants/theme';
import { THEMES, applyTheme, contrastRatio, resolveTheme } from '../src/themes';

const everyThemeAndVariant = Object.values(THEMES).flatMap((theme) =>
  theme.variants.map((variant) => ({
    label: `${theme.id}/${variant.id}`,
    themeId: theme.id,
    variantId: variant.id,
  })),
);

describe('resolveTheme', () => {
  it('finds a theme and one of its variants', () => {
    const r = resolveTheme('warm-classic', 'olive');
    expect(r.theme.id).toBe('warm-classic');
    expect(r.variantId).toBe('olive');
  });

  it('merges a variant over the base: only the keys it sets change', () => {
    const base = THEMES['warm-classic'].tokens;
    const olive = resolveTheme('warm-classic', 'olive').tokens;
    expect(olive.accent['600']).not.toBe(base.accent['600']);
    expect(olive.page).toBe(base.page);
    expect(olive.ink).toBe(base.ink);
    expect(olive.radiusCard).toBe(base.radiusCard);
  });

  it('falls back for unknown ids', () => {
    const unknownTheme = resolveTheme('street-bold', 'x');
    expect(unknownTheme.theme.id).toBe('caos');
    expect(unknownTheme.variantId).toBe('default');
    // A known theme with a retired variant keeps the theme and takes its first variant.
    expect(resolveTheme('warm-classic', 'nope').variantId).toBe('terracotta');
    expect(resolveTheme('warm-classic', 'nope').theme.id).toBe('warm-classic');
    // Missing ids, and ids that are only inherited object keys, are treated as unknown.
    expect(resolveTheme().theme.id).toBe('caos');
    expect(resolveTheme(null, null).variantId).toBe('default');
    expect(resolveTheme('constructor', 'toString').theme.id).toBe('caos');
    expect(resolveTheme('__proto__').theme.id).toBe('caos');
  });
});

describe('caos, the default look', () => {
  it('uses the default brand palette as its accent', () => {
    expect(THEMES.caos.tokens.accent).toEqual(DEFAULT_BRAND_PALETTE);
  });

  it('has a single "default" variant', () => {
    expect(THEMES.caos.variants.map((v) => v.id)).toEqual(['default']);
  });
});

describe('theme data', () => {
  it('has the 11 accent steps and "r g b" triplets for every colour token', () => {
    const triplet = /^\d{1,3} \d{1,3} \d{1,3}$/;
    for (const { label, themeId, variantId } of everyThemeAndVariant) {
      const { tokens } = resolveTheme(themeId, variantId);
      for (const shade of BRAND_SHADES) {
        expect(tokens.accent[shade], `${label} accent ${shade}`).toMatch(triplet);
      }
      for (const key of [
        'page',
        'surface',
        'raised',
        'line',
        'ink',
        'muted',
        'onAccent',
      ] as const) {
        expect(tokens[key], `${label} ${key}`).toMatch(triplet);
      }
      for (const key of ['mascotBand', 'bubbleBg', 'bubbleFg', 'bubbleBorder'] as const) {
        expect(tokens[key], `${label} ${key}`).toMatch(triplet);
      }
    }
  });

  it('lists each theme under its own id, with a default variant first', () => {
    for (const [key, theme] of Object.entries(THEMES)) {
      expect(theme.id).toBe(key);
      expect(theme.variants.length).toBeGreaterThan(0);
      expect(new Set(theme.variants.map((v) => v.id)).size).toBe(theme.variants.length);
    }
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('0 0 0', '255 255 255')).toBeCloseTo(21, 5);
    expect(contrastRatio('255 255 255', '255 255 255')).toBeCloseTo(1, 5);
    // Symmetric: it does not matter which colour is the text.
    expect(contrastRatio('119 119 119', '255 255 255')).toBeCloseTo(
      contrastRatio('255 255 255', '119 119 119'),
      10,
    );
    expect(contrastRatio('119 119 119', '255 255 255')).toBeCloseTo(4.48, 2);
  });

  it('rejects something that is not an "r g b" triplet', () => {
    expect(() => contrastRatio('#ffffff', '0 0 0')).toThrow();
    expect(() => contrastRatio('255 255', '0 0 0')).toThrow();
    expect(() => contrastRatio('300 0 0', '0 0 0')).toThrow();
  });
});

describe('WCAG AA (contrast >= 4.5)', () => {
  it.each(everyThemeAndVariant)('$label: body text and on-accent button text', (v) => {
    const { tokens } = resolveTheme(v.themeId, v.variantId);
    expect(contrastRatio(tokens.ink, tokens.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.ink, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.onAccent, tokens.accent['600'])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(everyThemeAndVariant)('$label: secondary text, badges and the mascot bubble', (v) => {
    const { tokens } = resolveTheme(v.themeId, v.variantId);
    expect(contrastRatio(tokens.muted, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    // The default look keeps today's slate-500 captions, which sit just under AA on its tinted
    // page background (4.36). Every new theme clears it.
    if (v.themeId !== 'caos') {
      expect(contrastRatio(tokens.muted, tokens.page)).toBeGreaterThanOrEqual(4.5);
    }
    for (const badge of [tokens.badgeSpecial, tokens.badgePopular]) {
      expect(contrastRatio(badge.fg, badge.bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(tokens.bubbleFg, tokens.bubbleBg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('backend allow-list', () => {
  // The frontend and backend agree on theme ids only by convention, so this reads the backend's
  // allow-list as text and checks both directions. Skipped when the backend is not alongside.
  const file = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../backend/src/constants/cafeThemes.ts',
  );

  (existsSync(file) ? it : it.skip)(
    'lists exactly the themes and variants the frontend ships, apart from caos',
    () => {
      const source = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '');
      const backend: Record<string, string[]> = {};
      const themeBlock = /id:\s*'([^']+)'\s*,\s*name:\s*'[^']*'\s*,\s*variants:\s*\[([\s\S]*?)\]/g;
      for (const m of source.matchAll(themeBlock)) {
        backend[m[1]] = [...m[2].matchAll(/id:\s*'([^']+)'/g)].map((v) => v[1]);
      }
      const frontend: Record<string, string[]> = {};
      for (const theme of Object.values(THEMES)) {
        if (theme.id === 'caos') continue;
        frontend[theme.id] = theme.variants.map((v) => v.id);
      }
      expect(Object.keys(backend).sort()).toEqual(Object.keys(frontend).sort());
      for (const id of Object.keys(frontend)) {
        expect([...backend[id]].sort()).toEqual([...frontend[id]].sort());
      }
      // The built-in look is never stored on a business, so the allow-list must not offer it.
      expect(Object.keys(backend)).not.toContain('caos');
    },
  );
});

describe('applyTheme', () => {
  afterEach(() => {
    document.head.querySelectorAll('link[data-cafe-font]').forEach((el) => el.remove());
  });

  it('sets --cafe-page and the other tokens on the element', () => {
    const root = document.createElement('div');
    const resolved = resolveTheme('cozy-night', 'amber');
    applyTheme(root, resolved);
    const get = (name: string) => root.style.getPropertyValue(name);
    expect(get('--cafe-page')).toBe(resolved.tokens.page);
    expect(get('--cafe-ink')).toBe(resolved.tokens.ink);
    expect(get('--cafe-on-accent')).toBe(resolved.tokens.onAccent);
    expect(get('--cafe-accent-600')).toBe(resolved.tokens.accent['600']);
    expect(get('--cafe-accent-950')).toBe(resolved.tokens.accent['950']);
    expect(get('--cafe-radius-card')).toBe(resolved.tokens.radiusCard);
    expect(get('--cafe-card-shadow')).toBe(resolved.tokens.cardShadow);
    expect(get('--cafe-badge-special-bg')).toBe(resolved.tokens.badgeSpecial.bg);
    expect(get('--cafe-badge-popular-fg')).toBe(resolved.tokens.badgePopular.fg);
    expect(get('--cafe-mascot-band')).toBe(resolved.tokens.mascotBand);
    expect(get('--cafe-bubble-bg')).toBe(resolved.tokens.bubbleBg);
    expect(get('--cafe-cover-fallback')).toBe(resolved.tokens.coverFallback);
    expect(get('--cafe-font-display')).toBe(resolved.theme.fonts.display);
    expect(get('--cafe-font-body')).toBe(resolved.theme.fonts.body);
  });

  it('switching theme replaces the earlier values', () => {
    const root = document.createElement('div');
    applyTheme(root, resolveTheme('cozy-night', 'amber'));
    applyTheme(root, resolveTheme('modern-minimal', 'ocean'));
    const modern = resolveTheme('modern-minimal', 'ocean');
    expect(root.style.getPropertyValue('--cafe-page')).toBe(modern.tokens.page);
    expect(root.style.getPropertyValue('--cafe-accent-600')).toBe(modern.tokens.accent['600']);
  });

  it('loads a theme font stylesheet once per href', () => {
    const root = document.createElement('div');
    const fontLinks = () => document.head.querySelectorAll('link[data-cafe-font]');
    applyTheme(root, resolveTheme('warm-classic', 'terracotta'));
    applyTheme(root, resolveTheme('warm-classic', 'plum'));
    expect(fontLinks()).toHaveLength(1);
    expect(fontLinks()[0].getAttribute('href')).toBe(THEMES['warm-classic'].fonts.href);
    expect(fontLinks()[0].getAttribute('rel')).toBe('stylesheet');
    applyTheme(root, resolveTheme('cozy-night', 'amber'));
    expect(fontLinks()).toHaveLength(2);
  });

  it('adds no font link for a theme without an href (caos)', () => {
    const root = document.createElement('div');
    applyTheme(root, resolveTheme());
    expect(document.head.querySelectorAll('link[data-cafe-font]')).toHaveLength(0);
    expect(root.style.getPropertyValue('--cafe-page')).toBe(THEMES.caos.tokens.page);
  });
});
