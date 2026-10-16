import { cafeIdentity } from '../config';

// Café identity is on for a business only when the platform switch (config cafeIdentity.enabled)
// and the café's own opt-in (business.identity.enabled) are both true. Every identity service,
// route and public payload asks this one helper, so flipping the platform switch darkens the
// whole feature at once. The parameter is structural so it accepts a Business doc, a lean
// object or a partial projection alike.
export const isIdentityOnFor = (business: { identity?: { enabled?: boolean } } | null | undefined): boolean =>
  cafeIdentity.enabled && business?.identity?.enabled === true;

/**
 * The identity block the guest pages receive inside the public business payloads
 * (GET /public/c/:slug and GET /public/orders/:id). It is the only shape of a café's identity that
 * leaves the server unauthenticated: enabledAt/appliedAt and the raw stored ids stay private.
 * `theme: null` means the default look. When identity is off for the café (or the platform) it is
 * the same inert block for everyone, so the frontend needs no second check.
 */
export interface PublicIdentity {
  enabled: boolean;
  mascotRendering: 'heavy' | 'light';
  theme: { id: string; variantId: string } | null;
  tagline: string;
}

export const toPublicIdentity = (
  business: { identity?: { enabled?: boolean; themeId?: string; variantId?: string; tagline?: string } } | null | undefined
): PublicIdentity => {
  const { mascotRendering } = cafeIdentity;
  if (!isIdentityOnFor(business)) {
    return { enabled: false, mascotRendering, theme: null, tagline: '' };
  }
  const { themeId, variantId, tagline } = business!.identity!;
  return {
    enabled: true,
    mascotRendering,
    // A theme needs both halves; a stray id alone is treated as "no theme chosen".
    theme: themeId && variantId ? { id: themeId, variantId } : null,
    tagline: tagline || ''
  };
};
