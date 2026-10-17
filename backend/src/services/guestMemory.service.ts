// Guest memory (spec §9.3, §10.4): the per-café profile of a returning guest, and the guest pass
// that recognises them. Both are earned only with proof that this device holds the phone: a
// fresh-OTP device proof, or a guest pass this café issued earlier for the same phone. An order
// without either is placed as usual but gets no pass and changes no memory, so knowing someone's
// number never earns their greeting or lets anyone rewrite it.
import mongoose from 'mongoose';
import { IBusiness } from '../models/Business';
import { Order } from '../models/Order';
import { upsertGuestVisit } from '../dao/guestProfile.dao';
import { isIdentityOnFor } from './cafeIdentity.service';
import { phoneKeyOf } from '../utils/phone';
import { signGuestPass, verifyDeviceProof, verifyGuestPass } from '../utils/guestToken';

type BusinessDoc = mongoose.HydratedDocument<IBusiness>;
type OrderDoc = InstanceType<typeof Order>;

export const GUEST_MEMORY_TTL_DAYS = 365;
const FIRST_NAME_MAX = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

export type GuestProofKind = 'DEVICE' | 'PASS';

export interface IssuedPass {
  guestToken?: string;
  guestTokenExpiresAt?: Date;
}

/** The first word of the name the guest typed, trimmed, at most 40 characters. */
export const firstNameOf = (customerName: string): string =>
  String(customerName || '').trim().split(/\s+/)[0].slice(0, FIRST_NAME_MAX);

/**
 * Which proof (if any) shows this device holds `phone` at this café: a device proof for that
 * phone, or a pass this café issued for it. A proof for any other phone or café counts for nothing.
 */
export const proofKindFor = (params: {
  businessId: string;
  phone: string;
  deviceProof?: unknown;
  guestPass?: unknown;
}): GuestProofKind | null => {
  const phone = phoneKeyOf(params.phone);
  if (!phone) return null;
  if (verifyDeviceProof(params.deviceProof)?.phone === phone) return 'DEVICE';
  if (verifyGuestPass(params.guestPass, params.businessId)?.phone === phone) return 'PASS';
  return null;
};

/**
 * Records a visit whose proof was already checked (the checkout flow checks it when the checkout
 * starts and places the order later): refreshes the profile and returns a fresh 180-day pass.
 */
export const recordProvenVisit = async (business: BusinessDoc, order: OrderDoc): Promise<IssuedPass> => {
  const phone = phoneKeyOf(order.customerPhone);
  if (!isIdentityOnFor(business) || !phone) return {};
  const now = new Date();
  await upsertGuestVisit(business._id, phone, {
    firstName: firstNameOf(order.customerName),
    lastVisitAt: now,
    expireAt: new Date(now.getTime() + GUEST_MEMORY_TTL_DAYS * DAY_MS)
  });
  const pass = signGuestPass({ phone, businessId: business._id.toString() });
  return { guestToken: pass.token, guestTokenExpiresAt: pass.expiresAt };
};

/**
 * After an order is placed: with a qualifying proof for the order's own phone, upsert the guest's
 * profile and return a fresh pass; otherwise `{}` and no write. Off when identity is off.
 */
export const recordVisit = async (params: {
  business: BusinessDoc;
  order: OrderDoc;
  deviceProof?: unknown;
  guestPass?: unknown;
}): Promise<IssuedPass> => {
  const { business, order } = params;
  if (!isIdentityOnFor(business)) return {};
  const kind = proofKindFor({
    businessId: business._id.toString(),
    phone: order.customerPhone,
    deviceProof: params.deviceProof,
    guestPass: params.guestPass
  });
  if (!kind) return {};
  return recordProvenVisit(business, order);
};
