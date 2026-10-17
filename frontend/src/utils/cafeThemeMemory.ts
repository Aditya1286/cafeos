// The look of the cafés this device has opened, kept in local storage per café slug, so the menu can
// paint a themed café's colours on the very first frame instead of flashing the default look until
// the café's data arrives (spec §12). The very first visit to a café can't know its theme and shows
// the default; every later visit paints the remembered theme at once and then follows the real data.
//
// Only a themed look is stored. A café with no theme (identity off, or the default look) is
// forgotten, so unthemed cafés keep rendering the default instantly, exactly as before.
//
// Storage can be blocked or throw (private windows), so everything here is a convenience: it never
// throws, and a missing or corrupt entry just means "nothing remembered".
import { DEFAULT_THEME_ID, resolveTheme } from '@/themes';
import type { PublicIdentity } from '@/themes';

export const CAFE_THEMES_KEY = 'caos_cafe_themes';
// A few cafés is plenty for one phone; the least recently opened go first.
const MAX_CAFES = 20;

export interface RememberedTheme {
  id: string;
  variantId: string;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const ID = /^[a-z0-9-]{1,40}$/;
const slugKey = (slug: string) => slug.trim().toLowerCase();

const valid = (t: unknown): t is RememberedTheme => {
  if (!t || typeof t !== 'object') return false;
  const e = t as Record<string, unknown>;
  return (
    typeof e.id === 'string' && ID.test(e.id) && typeof e.variantId === 'string' && ID.test(e.variantId)
  );
};

const read = (store: KeyValueStore | null): Record<string, RememberedTheme> => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(CAFE_THEMES_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, RememberedTheme> = {};
    for (const [slug, t] of Object.entries(parsed)) {
      if (valid(t)) out[slug] = { id: t.id, variantId: t.variantId };
    }
    return out;
  } catch {
    return {};
  }
};

const write = (store: KeyValueStore | null, themes: Record<string, RememberedTheme>) => {
  try {
    const entries = Object.entries(themes);
    store?.setItem(CAFE_THEMES_KEY, JSON.stringify(Object.fromEntries(entries.slice(-MAX_CAFES))));
  } catch {
    /* storage unavailable: the look just won't be remembered */
  }
};

/**
 * Remembers the look this café's public data resolved to, or forgets the café when it has none
 * (identity off, no theme, or the default look). Call it whenever the café loads.
 */
export const rememberCafeTheme = (
  slug: string,
  identity: Pick<PublicIdentity, 'enabled' | 'theme'> | null | undefined,
  store: KeyValueStore | null = browserStorage(),
): void => {
  const key = slugKey(slug);
  if (!key) return;
  const themes = read(store);
  delete themes[key];
  if (identity?.enabled) {
    const resolved = resolveTheme(identity.theme?.id, identity.theme?.variantId);
    if (resolved.theme.id !== DEFAULT_THEME_ID) {
      themes[key] = { id: resolved.theme.id, variantId: resolved.variantId };
    }
  }
  write(store, themes);
};

/** The remembered theme for a café, or null (never opened, unthemed, or storage unavailable). */
export const rememberedCafeTheme = (
  slug: string | undefined,
  store: KeyValueStore | null = browserStorage(),
): RememberedTheme | null => (slug ? (read(store)[slugKey(slug)] ?? null) : null);
