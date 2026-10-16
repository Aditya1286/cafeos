// Indian mobile numbers arrive in many shapes (9876543210, +91 98765 43210, 919876543210, 0987…).
// Comparisons and lookups use the last 10 digits, which is the subscriber number in every one.

/** The 10-digit form used to compare and look numbers up — '' if it isn't a full number. */
export const phoneKeyOf = (phone: string | undefined | null): string => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
};

/**
 * Matches a stored phone however it was typed (9876543210, +91 98765 43210, 919876543210, 098765 43210, …) given its
 * 10-digit key. It builds a regex from `key`, so anything that is not exactly ten digits (an empty or non-numeric
 * string, a regex fragment) returns a pattern that matches nothing, never one built from untrusted text.
 */
export const phoneMatchPattern = (key: string): RegExp => {
  if (typeof key !== 'string' || !/^\d{10}$/.test(key)) return /(?!)/; // never matches
  return new RegExp(`^\\D*(?:(?:\\+?91|0)\\D*)?${key.split('').join('\\D*')}\\D*$`);
};

export const isSamePhone = (a: string | undefined | null, b: string | undefined | null): boolean => {
  const key = phoneKeyOf(a);
  return !!key && key === phoneKeyOf(b);
};

/** "98••••••10" — enough for someone to recognise their own number, not to learn someone else's. */
export const maskPhone = (phone: string | undefined | null): string => {
  const key = phoneKeyOf(phone);
  return key ? `${key.slice(0, 2)}••••••${key.slice(-2)}` : '';
};
