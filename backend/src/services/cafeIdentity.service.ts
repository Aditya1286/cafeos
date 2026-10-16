import { cafeIdentity } from '../config';

// Café identity is on for a business only when the platform switch (config cafeIdentity.enabled)
// and the café's own opt-in (business.identity.enabled) are both true. Every identity service,
// route and public payload asks this one helper, so flipping the platform switch darkens the
// whole feature at once. The parameter is structural so it accepts a Business doc, a lean
// object or a partial projection alike.
export const isIdentityOnFor = (business: { identity?: { enabled?: boolean } } | null | undefined): boolean =>
  cafeIdentity.enabled && business?.identity?.enabled === true;
