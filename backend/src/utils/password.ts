import bcrypt from 'bcryptjs';
import { ServiceError } from './serviceError';

// Rules for every password set after signup (reset, change, a staff account). Kept deliberately
// simple: a length floor stops the trivially guessable, anything beyond is the user's call.
export const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // bcrypt only reads 72 bytes; this just caps silly input

/** Throws VALIDATION_ERROR unless `password` is an acceptable new password; returns it typed. */
export const assertValidNewPassword = (password: unknown): string => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new ServiceError(400, 'VALIDATION_ERROR', `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  return password;
};

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 10);
