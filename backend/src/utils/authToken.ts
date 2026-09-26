import jwt from 'jsonwebtoken';
import { config } from '../config';
import { IUser, UserRole } from '../models/User';

// Login tokens: issued here, and checked by both the REST `protect` middleware and the Socket.IO
// handshake (websocket/socketAuth.ts), so the two can never disagree about who is logged in.

export interface AuthTokenPayload {
  id: string;
  role: UserRole;
  businessId?: string;
  iat?: number; // seconds, set by jsonwebtoken
  // Millisecond issue time — `iat` alone is too coarse to tell a token issued just before a
  // password change from one issued just after it.
  iatMs?: number;
}

export const signAuthToken = (user: IUser): string =>
  jwt.sign({ id: user._id, role: user.role, businessId: user.businessId, iatMs: Date.now() }, config.jwtSecret, {
    expiresIn: '7d'
  });

/** Throws if the token is malformed, tampered with, or expired. */
export const verifyAuthToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, config.jwtSecret) as AuthTokenPayload;

/**
 * A token issued before the user's last password change is dead — that's what logs every other
 * session out after a reset or change. The token handed back by the change itself is signed after
 * `passwordChangedAt` is stored, so it stays valid.
 */
export const isTokenRevoked = (user: Pick<IUser, 'passwordChangedAt'>, payload: AuthTokenPayload): boolean => {
  if (!user.passwordChangedAt) return false;
  const changedAtMs = user.passwordChangedAt.getTime();
  if (typeof payload.iatMs === 'number') return payload.iatMs < changedAtMs;
  // Tokens from before iatMs existed: second precision is the best available.
  return typeof payload.iat === 'number' && payload.iat < Math.floor(changedAtMs / 1000);
};
