import { resolveTheme } from './registry';
import type { PublicIdentity } from './types';

// The mascot's dressing for a café's theme: the hat band and the bubble colours. Theme tokens are
// "r g b" triplets; the mascot wants a hex band (both renderers ignore anything else) and CSS
// colours for the bubble. Typed structurally so themes/ never imports the mascot (the route-scoping
// test in tests/mascotEngineLogic.test.ts keeps the mascot to its pages).

export interface ThemeMascotDress {
  band: string;
  bubbleBg: string;
  bubbleFg: string;
  bubbleBorder: string;
}

const channels = (triplet: string): number[] | null => {
  const parts = triplet.trim().split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
};

export const tripletToHex = (triplet: string): string | null => {
  const c = channels(triplet);
  return c ? `#${c.map((n) => n.toString(16).padStart(2, '0')).join('')}` : null;
};

const tripletToCss = (triplet: string): string | null => (channels(triplet) ? `rgb(${triplet.trim()})` : null);

/** The dress for a café whose identity is on, or undefined (the mascot keeps the CAOS colours). */
export const mascotDressFor = (identity: PublicIdentity | null | undefined): ThemeMascotDress | undefined => {
  if (!identity?.enabled) return undefined;
  const { tokens } = resolveTheme(identity.theme?.id, identity.theme?.variantId);
  const band = tripletToHex(tokens.mascotBand);
  const bubbleBg = tripletToCss(tokens.bubbleBg);
  const bubbleFg = tripletToCss(tokens.bubbleFg);
  const bubbleBorder = tripletToCss(tokens.bubbleBorder);
  if (!band || !bubbleBg || !bubbleFg || !bubbleBorder) return undefined;
  return { band, bubbleBg, bubbleFg, bubbleBorder };
};
