// The guest pass: what lets a café recognise a returning guest. The server hands one back with an
// order that was placed with proof (a fresh OTP on this device, or an earlier pass). It is valid at
// ONE café for 180 days, so passes are kept per café, keyed by the business's Mongo id.
//
// Knowing a phone number never earns recognition: only holding this token does. "Not you?" on a
// shared phone calls forgetGuestPass.
//
// Storage can be blocked or throw (private windows), so everything here is a convenience: it never
// throws, and a missing, corrupt or expired entry just means "not recognised".

export const GUEST_PASS_KEY = 'caos_guest_passes';
// A few cafés is plenty for one phone; the soonest-to-expire entries go first.
const MAX_CAFES = 20;

interface StoredPass {
  token: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// The key is a Mongo id and the token goes into a request header, so only the shapes the app itself
// produces are accepted: a header value with a stray newline or a space would make `fetch` throw
// and stop the order from being sent at all.
const BUSINESS_ID = /^[0-9a-f]{24}$/i;
const TOKEN = /^[\w-]{1,500}\.[\w-]{1,500}\.[\w-]{1,500}$/;

const valid = (p: unknown): p is StoredPass => {
  if (!p || typeof p !== 'object') return false;
  const e = p as Record<string, unknown>;
  return (
    typeof e.token === 'string' &&
    e.token.length <= 1000 &&
    TOKEN.test(e.token) &&
    typeof e.expiresAt === 'number' &&
    Number.isFinite(e.expiresAt)
  );
};

const read = (store: KeyValueStore | null, now: number): Record<string, StoredPass> => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(GUEST_PASS_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, StoredPass> = {};
    for (const [businessId, p] of Object.entries(parsed)) {
      if (BUSINESS_ID.test(businessId) && valid(p) && p.expiresAt > now) {
        out[businessId] = { token: p.token, expiresAt: p.expiresAt };
      }
    }
    return out;
  } catch {
    return {};
  }
};

const write = (store: KeyValueStore | null, passes: Record<string, StoredPass>) => {
  try {
    const kept = Object.entries(passes)
      .sort(([, a], [, b]) => b.expiresAt - a.expiresAt)
      .slice(0, MAX_CAFES);
    store?.setItem(GUEST_PASS_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* storage unavailable: the guest just won't be recognised next time */
  }
};

/** This café's live pass token, or null (none, expired, or unreadable). Expired entries are ignored. */
export const readGuestPass = (
  businessId: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): string | null => {
  if (!BUSINESS_ID.test(businessId)) return null;
  return read(store, now)[businessId]?.token ?? null;
};

/** Keeps (or renews) the pass for one café. `expiresAt` is the ISO time the server returned. */
export const saveGuestPass = (
  businessId: string,
  token: string,
  expiresAt: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): void => {
  const expires = Date.parse(expiresAt);
  const pass = { token, expiresAt: expires };
  if (!BUSINESS_ID.test(businessId) || !valid(pass) || expires <= now) return;
  write(store, { ...read(store, now), [businessId]: pass });
};

/** "Not you?": forget this café's pass on this device. Other cafés' passes are untouched. */
export const forgetGuestPass = (
  businessId: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): void => {
  const passes = read(store, now);
  if (!(businessId in passes)) return;
  delete passes[businessId];
  write(store, passes);
};
