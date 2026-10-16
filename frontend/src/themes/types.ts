import type { BrandPalette } from '@/constants/theme';

/**
 * Everything a café theme decides. Colours are "r g b" triplets, the form the --brand-* variables
 * use, so they work with `rgb(var(--cafe-x) / <alpha>)`. Radii and the shadow are CSS values;
 * `coverFallback` is a CSS `background` value.
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
  /** Text on an accent-600 button. */
  onAccent: string;
  /** The 11-step accent scale, 50 to 950, as for `brand-*`. Step 600 is the button colour. */
  accent: BrandPalette;
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
