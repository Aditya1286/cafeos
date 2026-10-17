import { caos } from './caos';
import { cozyNight } from './cozyNight';
import { modernMinimal } from './modernMinimal';
import { warmClassic } from './warmClassic';
import type { ResolvedTheme, ThemeDefinition, ThemeTokens } from './types';

/** The built-in look. Never stored on a business: "no theme" and "unknown theme" both mean this. */
export const DEFAULT_THEME_ID = 'caos';
export const DEFAULT_VARIANT_ID = 'default';

/**
 * Every theme, by id. Keep the ids (and each theme's variant ids) in step with
 * backend/src/constants/cafeThemes.ts; tests/themes.test.ts fails if they drift.
 */
export const THEMES: Record<string, ThemeDefinition> = {
  [caos.id]: caos,
  [warmClassic.id]: warmClassic,
  [modernMinimal.id]: modernMinimal,
  [cozyNight.id]: cozyNight,
};

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Looks up a stored theme + variant. Anything missing or unknown (a retired theme, a retired
 * variant, a typo, an inherited key such as "constructor") falls back rather than throwing: an
 * unknown theme gives the default look, and a known theme with an unknown variant gives that
 * theme's first variant. A variant overrides only the keys it sets.
 */
export function resolveTheme(themeId?: string | null, variantId?: string | null): ResolvedTheme {
  const theme: ThemeDefinition =
    themeId && hasOwn(THEMES, themeId) ? THEMES[themeId] : THEMES[DEFAULT_THEME_ID];
  const variant = theme.variants.find((v) => v.id === variantId) ?? theme.variants[0];

  const tokens: ThemeTokens = { ...theme.tokens };
  for (const [key, value] of Object.entries(variant.tokens)) {
    if (value !== undefined) (tokens as Record<string, unknown>)[key] = value;
  }
  return { theme, variantId: variant.id, tokens };
}
