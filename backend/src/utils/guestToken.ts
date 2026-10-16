import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { auth } from '../config';

// Two stateless tokens for recognising a returning guest (modelled on recoveryToken.ts):
//
//  - A DEVICE PROOF says "this device just passed a fresh OTP for this phone number". It is the
//    short-lived step that lets a guest mint a guest pass, so it lives only 30 minutes and is tied
//    to a number, not a café.
//  - A GUEST PASS says "this device was proven for this phone number, at THIS café". It lives 180
//    days, and it only opens the café it was issued for: the same number at another café needs its
//    own pass, so a pass can never be replayed across cafés.
//
// Each kind is signed with its own key, derived from the JWT secret by HMAC with a purpose string.
// A token of one kind can therefore never verify as the other, nor as a recovery token or a
// login/socket JWT (signed with the raw secret), whatever claims it carries.

export const DEVICE_PROOF_TTL_SECONDS = 30 * 60;
export const GUEST_PASS_TTL_SECONDS = 180 * 24 * 60 * 60;

const DEVICE_PROOF_TYPE = 'device-proof';
const GUEST_PASS_TYPE = 'guest';

const MAX_TOKEN_LENGTH = 1000;
/** The last ten digits of the number, as `phoneKeyOf` produces them. */
const PHONE_KEY = /^\d{10}$/;

const deviceProofKey = () => crypto.createHmac('sha256', auth.jwtSecret).update('device-proof-v1').digest();
const guestPassKey = () => crypto.createHmac('sha256', auth.jwtSecret).update('guest-pass-v1').digest();

const sign = (claims: Record<string, unknown>, key: Buffer, ttlSeconds: number) => {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  return { token: jwt.sign({ ...claims, iat, exp }, key, { algorithm: 'HS256' }), expiresAt: new Date(exp * 1000) };
};

/** The claims of a genuine, unexpired token of this kind, or null for anything else (never throws). */
const read = (token: unknown, key: Buffer, type: string): Record<string, unknown> | null => {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const p = jwt.verify(token, key, { algorithms: ['HS256'] }) as Record<string, unknown>;
    if (p.typ !== type || typeof p.ten !== 'string' || !PHONE_KEY.test(p.ten)) return null;
    return p;
  } catch {
    return null;
  }
};

/** Proof that this device just verified `phoneKey` (10 digits) with a fresh OTP. */
export const signDeviceProof = (phoneKey: string, ttlSeconds: number = DEVICE_PROOF_TTL_SECONDS): string =>
  sign({ typ: DEVICE_PROOF_TYPE, ten: phoneKey }, deviceProofKey(), ttlSeconds).token;

export const verifyDeviceProof = (token: unknown): { phone: string } | null => {
  const p = read(token, deviceProofKey(), DEVICE_PROOF_TYPE);
  return p ? { phone: p.ten as string } : null;
};

/** A long-lived pass that recognises `phone` at one café (`businessId`, the Mongo id) only. */
export const signGuestPass = (
  { phone, businessId }: { phone: string; businessId: string },
  ttlSeconds: number = GUEST_PASS_TTL_SECONDS
): { token: string; expiresAt: Date } => sign({ typ: GUEST_PASS_TYPE, ten: phone, bid: businessId }, guestPassKey(), ttlSeconds);

/** The phone a pass was issued for, only if it is genuine, unexpired and issued for `businessId`. */
export const verifyGuestPass = (token: unknown, businessId: string): { phone: string } | null => {
  const p = read(token, guestPassKey(), GUEST_PASS_TYPE);
  if (!p || typeof businessId !== 'string' || businessId.length === 0 || p.bid !== businessId) return null;
  return { phone: p.ten as string };
};
