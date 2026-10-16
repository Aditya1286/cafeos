/**
 * The café themes a business may choose, by id. Ids and display names only: colours, fonts and
 * shapes live in the frontend (frontend/src/themes). The frontend test tests/themes.test.ts reads
 * this file as text and fails if its ids differ from the ones the frontend ships, so change both
 * together.
 *
 * The built-in default look ("caos", variant "default") is deliberately not listed: it is never
 * stored on a business. A business with no theme, or with an id the frontend no longer knows, is
 * shown the default look.
 */
export const CAFE_THEMES: ReadonlyArray<{
  id: string;
  name: string;
  variants: ReadonlyArray<{ id: string; name: string }>;
}> = [
  {
    id: 'warm-classic',
    name: 'Warm Classic',
    variants: [
      { id: 'terracotta', name: 'Terracotta' },
      { id: 'olive', name: 'Olive' },
      { id: 'plum', name: 'Plum' },
    ],
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    variants: [
      { id: 'sage', name: 'Sage' },
      { id: 'ocean', name: 'Ocean' },
      { id: 'charcoal', name: 'Charcoal' },
    ],
  },
  {
    id: 'cozy-night',
    name: 'Cozy Night',
    variants: [
      { id: 'amber', name: 'Amber' },
      { id: 'ember', name: 'Ember' },
      { id: 'mint', name: 'Mint' },
    ],
  },
];

/** True when `themeId` is a launch theme and `variantId` is one of that theme's variants. */
export const isValidTheme = (themeId: string, variantId: string): boolean =>
  CAFE_THEMES.some((t) => t.id === themeId && t.variants.some((v) => v.id === variantId));
