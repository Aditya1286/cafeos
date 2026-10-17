// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CafeThemeScope } from '../src/themes/CafeThemeScope';
import { THEMES, resolveTheme } from '../src/themes';
import type { PublicIdentity } from '../src/themes';

const identity = (over: Partial<PublicIdentity> = {}): PublicIdentity => ({
  enabled: true,
  mascotRendering: 'light',
  theme: { id: 'cozy-night', variantId: 'amber' },
  tagline: '',
  ...over,
});

const renderScope = (value: PublicIdentity | null | undefined) => {
  const { container } = render(
    <CafeThemeScope identity={value}>
      <p>menu</p>
    </CafeThemeScope>,
  );
  const scope = container.firstElementChild as HTMLElement;
  return { scope, get: (name: string) => scope.style.getPropertyValue(`--cafe-${name}`) };
};

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[data-cafe-font]').forEach((el) => el.remove());
});

describe('CafeThemeScope', () => {
  it('renders its children inside a full-height div', () => {
    const { scope } = renderScope(undefined);
    expect(scope.tagName).toBe('DIV');
    expect(scope.classList.contains('min-h-screen')).toBe(true);
    expect(scope.textContent).toBe('menu');
  });

  it("applies the café's theme and variant when identity is on", () => {
    const { get } = renderScope(identity());
    expect(get('page')).toBe(THEMES['cozy-night'].tokens.page);
    const ember = resolveTheme('cozy-night', 'ember').tokens;
    const { get: getEmber } = renderScope(
      identity({ theme: { id: 'cozy-night', variantId: 'ember' } }),
    );
    expect(getEmber('accent-600')).toBe(ember.accent['600']);
  });

  it('uses the caos look when identity is off, even if a theme is set', () => {
    const { get } = renderScope(identity({ enabled: false }));
    expect(get('page')).toBe(THEMES.caos.tokens.page);
    expect(get('accent-500')).toBe(THEMES.caos.tokens.accent['500']);
  });

  it('uses the caos look for a null or missing identity', () => {
    expect(renderScope(null).get('page')).toBe(THEMES.caos.tokens.page);
    expect(renderScope(undefined).get('page')).toBe(THEMES.caos.tokens.page);
  });

  it('uses the caos look when identity is on but no theme is chosen, or the theme is unknown', () => {
    expect(renderScope(identity({ theme: null })).get('page')).toBe(THEMES.caos.tokens.page);
    expect(
      renderScope(identity({ theme: { id: 'street-bold', variantId: 'x' } })).get('page'),
    ).toBe(THEMES.caos.tokens.page);
  });

  it('switches theme when the identity changes', () => {
    const { container, rerender } = render(
      <CafeThemeScope identity={undefined}>
        <p>menu</p>
      </CafeThemeScope>,
    );
    const scope = container.firstElementChild as HTMLElement;
    expect(scope.style.getPropertyValue('--cafe-page')).toBe(THEMES.caos.tokens.page);
    rerender(
      <CafeThemeScope identity={identity({ theme: { id: 'warm-classic', variantId: 'olive' } })}>
        <p>menu</p>
      </CafeThemeScope>,
    );
    const olive = resolveTheme('warm-classic', 'olive').tokens;
    expect(scope.style.getPropertyValue('--cafe-page')).toBe(olive.page);
    expect(scope.style.getPropertyValue('--cafe-accent-600')).toBe(olive.accent['600']);
  });

  it('writes the button colour from the shade the theme names', () => {
    const { get } = renderScope(undefined);
    expect(get('button')).toBe(THEMES.caos.tokens.accent[THEMES.caos.tokens.buttonShade]);
    const { get: getWarm } = renderScope(
      identity({ theme: { id: 'warm-classic', variantId: 'terracotta' } }),
    );
    expect(getWarm('button')).toBe(THEMES['warm-classic'].tokens.accent['600']);
  });

  it('hides its content while the identity is still loading', () => {
    const { container } = render(
      <CafeThemeScope identity={undefined} pending>
        <p>menu</p>
      </CafeThemeScope>,
    );
    expect((container.firstElementChild as HTMLElement).classList.contains('invisible')).toBe(true);
  });
});
