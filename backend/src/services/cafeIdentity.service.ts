import mongoose from 'mongoose';
import { cafeIdentity } from '../config';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { isValidTheme } from '../constants/cafeThemes';
import { ServiceError } from '../utils/serviceError';

/** A café may point guests to at most this many dishes as its "house specials". */
export const HOUSE_SPECIAL_MAX = 3;

/** The longest tagline an owner may save, in characters. */
export const TAGLINE_MAX = 80;

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

// ── Settings ────────────────────────────────────────────────────────────────

type StoredIdentity = { themeId?: string; variantId?: string; appliedAt?: Date } | undefined;

interface ThemeInput {
  themeId?: string | null;
  variantId?: string | null;
}

// Turns a themeId/variantId request into the update that applies it, or null when it doesn't touch
// the theme. Both ids must be given together (no half-set themes are ever stored); an explicit
// null themeId clears the theme and its variant. A variant alone is read against the stored theme.
// appliedAt is the moment a theme was first chosen: kept while the theme is merely changed, and
// forgotten when it is cleared.
const themeUpdate = (stored: StoredIdentity, input: ThemeInput): { set: Record<string, unknown>; unset: Record<string, ''> } | null => {
  const { themeId, variantId } = input;
  if (themeId === undefined && variantId === undefined) return null;

  if (themeId === null) {
    return { set: {}, unset: { 'identity.themeId': '', 'identity.variantId': '', 'identity.appliedAt': '' } };
  }
  const effectiveThemeId = themeId === undefined ? stored?.themeId : themeId;
  if (typeof effectiveThemeId !== 'string' || typeof variantId !== 'string' || !isValidTheme(effectiveThemeId, variantId)) {
    throw new ServiceError(400, 'INVALID_THEME', 'Please choose one of the available themes and one of its colour variants.');
  }
  const set: Record<string, unknown> = { 'identity.themeId': effectiveThemeId, 'identity.variantId': variantId };
  if (!stored?.themeId) set['identity.appliedAt'] = new Date();
  return { set, unset: {} };
};

const loadBusiness = async (businessId: string) => {
  const business = mongoose.Types.ObjectId.isValid(businessId) ? await Business.findById(businessId) : null;
  if (!business) {
    throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
  }
  return business;
};

const applyUpdate = (set: Record<string, unknown>, unset: Record<string, ''>) => ({
  ...(Object.keys(set).length ? { $set: set } : {}),
  ...(Object.keys(unset).length ? { $unset: unset } : {})
});

/**
 * The owner's "Café look" save: a theme and variant from the allow-list, and a short tagline. Only
 * while identity is on for the café (platform switch and the café's own); the owner can never turn
 * it on, only a super admin can.
 */
export const updateOwnerIdentity = async (
  businessId: string,
  input: { themeId?: string | null; variantId?: string | null; tagline?: string }
): Promise<PublicIdentity> => {
  const business = await loadBusiness(businessId);
  if (!isIdentityOnFor(business)) {
    throw new ServiceError(403, 'IDENTITY_OFF', 'Café identity is not switched on for your business.');
  }

  const theme = themeUpdate(business.identity, input);

  const set: Record<string, unknown> = { ...theme?.set };
  if (input.tagline !== undefined) {
    if (typeof input.tagline !== 'string' || input.tagline.trim().length > TAGLINE_MAX) {
      throw new ServiceError(400, 'VALIDATION_ERROR', `The tagline must be text of at most ${TAGLINE_MAX} characters.`);
    }
    set['identity.tagline'] = input.tagline.trim();
  }

  // Filtered on the café still being on, so a super admin switching it off mid-request wins.
  const updated = await Business.findOneAndUpdate(
    { _id: business._id, 'identity.enabled': true },
    applyUpdate(set, theme?.unset ?? {}),
    { new: true }
  );
  if (!updated) {
    throw new ServiceError(403, 'IDENTITY_OFF', 'Café identity is not switched on for your business.');
  }
  return toPublicIdentity(updated);
};

/**
 * The super admin's per-café control: switch identity on or off, and set or clear the theme for a
 * café (onboarding calls), whether or not the café is on yet. The result is the public block, so a
 * café that is off reads as off with no theme shown.
 */
export const adminSetIdentity = async (
  businessId: string,
  input: { enabled?: boolean; themeId?: string | null; variantId?: string | null }
): Promise<PublicIdentity> => {
  const business = await loadBusiness(businessId);
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'enabled must be true or false.');
  }

  const theme = themeUpdate(business.identity, input);
  const set: Record<string, unknown> = { ...theme?.set };
  if (input.enabled !== undefined) {
    set['identity.enabled'] = input.enabled;
    // enabledAt marks the moment of switching on; switching on again later doesn't move it.
    if (input.enabled && !business.identity?.enabled) set['identity.enabledAt'] = new Date();
  }

  const updated = await Business.findByIdAndUpdate(business._id, applyUpdate(set, theme?.unset ?? {}), { new: true });
  return toPublicIdentity(updated);
};

/**
 * Marks (or unmarks) one of the café's dishes as a house special. At most HOUSE_SPECIAL_MAX dishes
 * on the menu can be marked; a dish archived from the menu stops counting. Repeating a request is
 * harmless.
 */
export const setHouseSpecial = async (
  businessId: string,
  productId: string,
  on: boolean
): Promise<{ productId: string; isHouseSpecial: boolean }> => {
  if (typeof on !== 'boolean') {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'on must be true or false.');
  }
  const product = mongoose.Types.ObjectId.isValid(productId)
    ? await Product.findOne({ _id: productId, businessId, isDeleted: false })
    : null;
  if (!product) {
    throw new ServiceError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');
  }
  const result = { productId: product._id.toString(), isHouseSpecial: on };
  if (product.isHouseSpecial === on) return result;

  const countSpecials = () => Product.countDocuments({ businessId, isHouseSpecial: true, isDeleted: false });
  const limitError = () =>
    new ServiceError(400, 'HOUSE_SPECIAL_LIMIT', `You can pick at most ${HOUSE_SPECIAL_MAX} house specials. Remove one first.`);

  if (on && (await countSpecials()) >= HOUSE_SPECIAL_MAX) throw limitError();
  await Product.updateOne({ _id: product._id }, { $set: { isHouseSpecial: on } });

  // Two requests that both passed the count above would overshoot the limit; the later look at the
  // count catches that and undoes this one, so the limit holds without a transaction.
  if (on && (await countSpecials()) > HOUSE_SPECIAL_MAX) {
    await Product.updateOne({ _id: product._id }, { $set: { isHouseSpecial: false } });
    throw limitError();
  }
  return result;
};
