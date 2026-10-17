import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { auth } from '../config';

// "My orders" sessions. After a customer proves their phone with a fresh OTP, the lookup hands back
// one of these so the same number's orders can be listed again on that device without another code.
// It is stateless (nothing stored server-side), scoped to ONE number at ONE café, and short-lived:
// exactly the lookup window, so it is never useful for longer than the data it unlocks.

export const RECOVERY_SESSION_TTL_SECONDS = 12 * 60 * 60;

const TOKEN_TYPE = 'order-recovery';

// A key derived from the JWT secret instead of the secret itself: a login/socket JWT can never
// verify as a recovery token, and a recovery token can never verify as a login, whatever claims
// either carries.
const signingKey = () => crypto.createHmac('sha256', auth.jwtSecret).update('order-recovery-session-v1').digest();

export interface RecoveryTokenPayload {
  /** The ten digits of the verified phone number. */
  phone: string;
  /** The café (Mongo id) it is valid for. */
  businessId: string;
}

export interface RecoverySession {
  token: string;
  expiresAt: Date;
}

export const signRecoveryToken = (
  { phone, businessId }: RecoveryTokenPayload,
  ttlSeconds: number = RECOVERY_SESSION_TTL_SECONDS
): RecoverySession => {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const token = jwt.sign({ typ: TOKEN_TYPE, ten: phone, bid: businessId, iat, exp }, signingKey(), { algorithm: 'HS256' });
  return { token, expiresAt: new Date(exp * 1000) };
};

/** The payload of a genuine, unexpired recovery token, or null for anything else (never throws). */
export const readRecoveryToken = (token: unknown): RecoveryTokenPayload | null => {
  if (typeof token !== 'string' || token.length === 0 || token.length > 1000) return null;
  try {
    const p = jwt.verify(token, signingKey(), { algorithms: ['HS256'] }) as Record<string, unknown>;
    if (p.typ !== TOKEN_TYPE || typeof p.ten !== 'string' || !/^[6-9]\d{9}$/.test(p.ten) || typeof p.bid !== 'string') return null;
    return { phone: p.ten, businessId: p.bid };
  } catch {
    return null;
  }
};
