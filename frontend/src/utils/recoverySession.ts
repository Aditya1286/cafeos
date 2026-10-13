// "My orders": once a customer has proved their phone with a one-time code, the server hands back a
// signed token good for 12 hours at that café. It is kept here so the same number's other orders can
// be listed again without another code. Only the token, its expiry and a MASKED number (for the
// "orders for 60••••••78" label) are stored: never the phone number itself.
//
// Storage can be blocked or throw (private windows), so everything here is a convenience: it never
// throws, and a missing, corrupt or expired entry just means "ask for the code again".

export const RECOVERY_SESSIONS_KEY = 'caos_recovery_sessions';
const MAX_CAFES = 10;

export interface StoredRecoverySession {
  token: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
  /** e.g. 60••••••78 */
  phoneMask: string;
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): KeyValueStore | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// The token goes into request bodies and the mask onto the screen, so only the shapes the app itself
// produces are accepted (a JWT-like token; digits and bullets for the mask).
const TOKEN = /^[\w-]{1,500}\.[\w-]{1,500}\.[\w-]{1,500}$/;
const MASK = /^[\d•*]{4,16}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/i;

const valid = (s: unknown): s is StoredRecoverySession => {
  if (!s || typeof s !== 'object') return false;
  const e = s as Record<string, unknown>;
  return (
    typeof e.token === 'string' &&
    e.token.length <= 1000 &&
    TOKEN.test(e.token) &&
    typeof e.expiresAt === 'number' &&
    Number.isFinite(e.expiresAt) &&
    typeof e.phoneMask === 'string' &&
    MASK.test(e.phoneMask)
  );
};

const read = (store: KeyValueStore | null, now: number): Record<string, StoredRecoverySession> => {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(RECOVERY_SESSIONS_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, StoredRecoverySession> = {};
    for (const [slug, s] of Object.entries(parsed)) {
      if (SLUG.test(slug) && valid(s) && s.expiresAt > now) {
        out[slug] = { token: s.token, expiresAt: s.expiresAt, phoneMask: s.phoneMask };
      }
    }
    return out;
  } catch {
    return {};
  }
};

const write = (store: KeyValueStore | null, sessions: Record<string, StoredRecoverySession>) => {
  try {
    const newest = Object.entries(sessions)
      .sort(([, a], [, b]) => b.expiresAt - a.expiresAt)
      .slice(0, MAX_CAFES);
    store?.setItem(RECOVERY_SESSIONS_KEY, JSON.stringify(Object.fromEntries(newest)));
  } catch {
    /* storage unavailable: the customer will just be asked for a code again */
  }
};

/** The live session for this café, or null (none, expired, or unreadable). */
export const getRecoverySession = (
  slug: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): StoredRecoverySession | null => read(store, now)[slug] ?? null;

export const saveRecoverySession = (
  slug: string,
  session: StoredRecoverySession,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): void => {
  if (!SLUG.test(slug) || !valid(session) || session.expiresAt <= now) return;
  write(store, {
    ...read(store, now),
    // Copy just the known fields, so nothing else a caller passes along (a phone number) is stored.
    [slug]: { token: session.token, expiresAt: session.expiresAt, phoneMask: session.phoneMask },
  });
};

/** "Not you?" / an expired session: forget it for this café. */
export const clearRecoverySession = (
  slug: string,
  store: KeyValueStore | null = browserStorage(),
  now: number = Date.now(),
): void => {
  const sessions = read(store, now);
  if (!(slug in sessions)) return;
  delete sessions[slug];
  write(store, sessions);
};
