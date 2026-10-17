import { BRAND_SHADES } from '@/constants/theme';
import type { ResolvedTheme } from './types';

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Adds the theme's Google Fonts stylesheet once per href, so switching back and forth is free. */
const ensureFontStylesheet = (doc: Document, href: string) => {
  const already = Array.from(doc.head.querySelectorAll('link[data-cafe-font]')).some(
    (el) => el.getAttribute('href') === href,
  );
  if (already) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.setAttribute('data-cafe-font', '');
  doc.head.appendChild(link);
};

/**
 * Writes a resolved theme onto `root` as --cafe-* custom properties, for example --cafe-page,
 * --cafe-on-accent, --cafe-accent-600, --cafe-neutral-400, --cafe-button (the accent step named by
 * `buttonShade`), --cafe-radius-card, --cafe-badge-special-bg, --cafe-mascot-band,
 * --cafe-font-display. Colours are "r g b" triplets (use them as `rgb(var(--cafe-page))`); radii,
 * shadow, cover and fonts are plain CSS values. Every theme sets every token, so calling it again
 * replaces the earlier theme. Loads the theme's web font once.
 */
export function applyTheme(root: HTMLElement, resolved: ResolvedTheme): void {
  const { tokens, theme } = resolved;
  const set = (name: string, value: string) => root.style.setProperty(`--cafe-${name}`, value);

  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'accent' || key === 'neutral' || key === 'buttonShade') continue;
    if (key === 'badgeSpecial' || key === 'badgePopular') {
      const badge = value as { bg: string; fg: string };
      set(`${kebab(key)}-bg`, badge.bg);
      set(`${kebab(key)}-fg`, badge.fg);
    } else {
      set(kebab(key), value as string);
    }
  }
  for (const shade of BRAND_SHADES) {
    set(`accent-${shade}`, tokens.accent[shade]);
    set(`neutral-${shade}`, tokens.neutral[shade]);
  }
  set('button', tokens.accent[tokens.buttonShade]);

  set('font-display', theme.fonts.display);
  set('font-body', theme.fonts.body);
  if (theme.fonts.href) ensureFontStylesheet(root.ownerDocument, theme.fonts.href);
}
