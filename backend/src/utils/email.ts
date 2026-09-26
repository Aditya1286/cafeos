import { ServiceError } from './serviceError';

// Deliberately loose — "something@something.tld". Real validation is the user receiving mail.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lower-cased, trimmed email, or a VALIDATION_ERROR if it doesn't look like one. */
export const normalizeEmail = (email: unknown): string => {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(value)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Enter a valid email address.');
  }
  return value;
};
