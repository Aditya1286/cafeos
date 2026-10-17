import type { BrandPalette, BrandShade } from '@/constants/theme';

/**
 * Everything a café theme decides. Colours are "r g b" triplets, the form the --brand-* variables
 * use, so they work with `rgb(var(--cafe-x) / <alpha>)`. Radii and the shadow are CSS values;
 * `coverFallback` and `dishFallback` are CSS `background` values.
 *
 * The two 11-step scales (`accent`, `neutral`) run outwards from the surface: 50 sits closest to
 * the surface and 950 farthest from it. On a light theme that is light to dark, like Tailwind's
 * scales; on a dark theme (Cozy Night) it is dark to light. So `bg-cafe-accent-50` is always a
 * soft tint and `text-cafe-neutral-700` always strong text, whatever the theme.
 */
export type ThemeTokens = {
  /** Page background. */
  page: string;
  /** Cards and sheets. */
  surface: string;
  /** A step above the surface: chips, input fields, image placeholders. */
  raised: string;
  /** Borders and dividers. */
  line: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Text on a filled accent control (the `button` colour). */
  onAccent: string;
  /** The 11-step accent scale, 50 to 950, as for `brand-*`. */
  accent: BrandPalette;
  /**
   * The accent step used for filled controls (quantity stepper, current tracker step, selection),
   * written as --cafe-button. 600 for the launch themes; caos keeps today's 500.
   */
  buttonShade: BrandShade;
  /**
   * The neutral 11-step scale for secondary text, dividers and fields, 50 to 950. Step 900 is
   * `ink` and step 500 is `muted`. For caos it is Tailwind's slate, which the pages used before.
   */
  neutral: BrandPalette;
  radiusCard: string;
  radiusChip: string;
  radiusButton: string;
  radiusImage: string;
  cardShadow: string;
  /** The "House special" badge. */
  badgeSpecial: { bg: string; fg: string };
  /** The "Most ordered" badge. */
  badgePopular: { bg: string; fg: string };
  /** Cover treatment when the café has no photo. */
  coverFallback: string;
  /**
   * A dish tile with no photo. May use the other --cafe-* variables (e.g. the accent), so a
   * variant's accent carries through without restating it.
   */
  dishFallback: string;
  /** The band on the mascot's hat. */
  mascotBand: string;
  bubbleBg: string;
  bubbleFg: string;
  bubbleBorder: string;
};

export type ThemeFonts = {
  display: string;
  body: string;
  /** A Google Fonts CSS URL, loaded on demand (once per href). Absent when the page already has the font. */
  href?: string;
};

/** A colour variant. It sets only the keys it overrides; fonts and shapes are never varied. */
export type VariantDefinition = {
  id: string;
  name: string;
  /** A CSS colour for the picker dot. */
  swatch: string;
  tokens: Partial<ThemeTokens>;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  fonts: ThemeFonts;
  /** The base tokens, which include the first variant's accent. */
  tokens: ThemeTokens;
  /** At least one. The first is the default, used when a stored variant id is unknown. */
  variants: VariantDefinition[];
};

export type ResolvedTheme = {
  theme: ThemeDefinition;
  variantId: string;
  tokens: ThemeTokens;
};

/**
 * The `identity` block of the public café and order payloads (backend cafeIdentity.service.ts
 * `toPublicIdentity`). When café identity is off for the café, `enabled` is false and `theme` null.
 */
export type PublicIdentity = {
  enabled: boolean;
  mascotRendering: 'heavy' | 'light';
  theme: { id: string; variantId: string } | null;
  tagline: string;
};
