// Calendar arithmetic on 'YYYY-MM-DD' keys. Pure UTC date math, so it has no daylight-saving or
// server-timezone surprises: a key names a calendar day, nothing more.

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export const parseDateKey = (key: string): [number, number, number] => {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
};

const toKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const isValidDateKey = (key: string): boolean => {
  if (!DATE_KEY.test(key)) return false;
  const [y, m, d] = parseDateKey(key);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const addDaysKey = (key: string, days: number): string => {
  const [y, m, d] = parseDateKey(key);
  return toKey(Date.UTC(y, m - 1, d + days));
};

/** Whole days from `b` to `a` (a − b). */
export const diffDaysKey = (a: string, b: string): number => {
  const [ay, am, ad] = parseDateKey(a);
  const [by, bm, bd] = parseDateKey(b);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / DAY_MS);
};

/** The Monday on or before this day (weeks run Monday to Sunday). */
export const mondayOfKey = (key: string): string => {
  const [y, m, d] = parseDateKey(key);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDaysKey(key, -((dow + 6) % 7));
};

export const firstOfMonthKey = (key: string): string => `${key.slice(0, 8)}01`;

/** Same calendar date `years` away; 29 Feb falls back to 28 Feb in a non-leap year. */
export const shiftYearsKey = (key: string, years: number): string => {
  const [y, m, d] = parseDateKey(key);
  const target = y + years;
  const daysInMonth = new Date(Date.UTC(target, m, 0)).getUTCDate();
  return toKey(Date.UTC(target, m - 1, Math.min(d, daysInMonth)));
};
