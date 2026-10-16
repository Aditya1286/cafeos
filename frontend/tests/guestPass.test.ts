import { describe, it, expect } from 'vitest';
import {
  GUEST_PASS_KEY,
  forgetGuestPass,
  readGuestPass,
  saveGuestPass,
} from '../src/utils/guestPass';

const NOW = Date.parse('2026-10-17T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const store = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};
const CAFE_A = 'a'.repeat(24);
const CAFE_B = 'b'.repeat(24);
// Looks like the server's tokens: three base64url parts.
const TOKEN_A = 'eyJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJndWVzdCJ9.c2lnbmF0dXJlQQ';
const TOKEN_B = 'eyJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJndWVzdCIsImIiOjF9.c2lnbmF0dXJlQg';
const inDays = (n: number) => new Date(NOW + n * DAY).toISOString();

describe('guest pass storage (recognition kept on this device, per café)', () => {
  it('uses the agreed storage key', () => {
    expect(GUEST_PASS_KEY).toBe('caos_guest_passes');
  });

  it('saves a pass and reads it back (round trip)', () => {
    const s = store();
    saveGuestPass(CAFE_A, TOKEN_A, inDays(180), s, NOW);
    expect(readGuestPass(CAFE_A, s, NOW)).toBe(TOKEN_A);
  });

  it('saving again renews the pass for that café', () => {
    const s = store();
    saveGuestPass(CAFE_A, TOKEN_A, inDays(10), s, NOW);
    saveGuestPass(CAFE_A, TOKEN_B, inDays(180), s, NOW);
    expect(readGuestPass(CAFE_A, s, NOW)).toBe(TOKEN_B);
    expect(readGuestPass(CAFE_A, s, NOW + 20 * DAY)).toBe(TOKEN_B);
  });

  it('returns null once the pass has expired, and drops it from the store', () => {
    const s = store();
    saveGuestPass(CAFE_A, TOKEN_A, inDays(180), s, NOW);
    expect(readGuestPass(CAFE_A, s, NOW + 179 * DAY)).toBe(TOKEN_A);
    expect(readGuestPass(CAFE_A, s, NOW + 181 * DAY)).toBeNull();
    // A later write sweeps the expired entry out instead of carrying it forever.
    saveGuestPass(CAFE_B, TOKEN_B, inDays(181 + 180), s, NOW + 181 * DAY);
    expect(Object.keys(JSON.parse(s.data[GUEST_PASS_KEY]))).toEqual([CAFE_B]);
  });

  it('does not save a pass that is already expired or has an unreadable expiry', () => {
    const s = store();
    saveGuestPass(CAFE_A, TOKEN_A, inDays(-1), s, NOW);
    saveGuestPass(CAFE_A, TOKEN_A, 'not a date', s, NOW);
    saveGuestPass(CAFE_A, TOKEN_A, '', s, NOW);
    expect(readGuestPass(CAFE_A, s, NOW)).toBeNull();
    expect(s.data[GUEST_PASS_KEY]).toBeUndefined();
  });

  it('keeps passes per café: saving or forgetting one never touches another', () => {
    const s = store();
    saveGuestPass(CAFE_A, TOKEN_A, inDays(180), s, NOW);
    saveGuestPass(CAFE_B, TOKEN_B, inDays(90), s, NOW);
    expect(readGuestPass(CAFE_A, s, NOW)).toBe(TOKEN_A);
    expect(readGuestPass(CAFE_B, s, NOW)).toBe(TOKEN_B);
    expect(readGuestPass('c'.repeat(24), s, NOW)).toBeNull();
    forgetGuestPass(CAFE_B, s, NOW);
    expect(readGuestPass(CAFE_B, s, NOW)).toBeNull();
    expect(readGuestPass(CAFE_A, s, NOW)).toBe(TOKEN_A);
  });

  it('forgetting a café with no pass changes nothing', () => {
    const s = store();
    saveGuestPass(CAFE_A, TOKEN_A, inDays(180), s, NOW);
    const before = s.data[GUEST_PASS_KEY];
    forgetGuestPass(CAFE_B, s, NOW);
    expect(s.data[GUEST_PASS_KEY]).toBe(before);
  });

  it('treats a corrupt store as "no pass" instead of breaking', () => {
    for (const bad of [
      'not json',
      '[1,2,3]',
      'null',
      '"str"',
      `{"${CAFE_A}":"x"}`,
      `{"${CAFE_A}":{"token":5,"expiresAt":${NOW + DAY}}}`,
      `{"${CAFE_A}":{"token":"${TOKEN_A}"}}`,
      `{"${CAFE_A}":{"token":"${TOKEN_A}","expiresAt":"soon"}}`,
    ]) {
      expect(readGuestPass(CAFE_A, store({ [GUEST_PASS_KEY]: bad }), NOW)).toBeNull();
    }
  });

  it('a corrupt store does not stop a new pass being saved', () => {
    const s = store({ [GUEST_PASS_KEY]: 'not json' });
    saveGuestPass(CAFE_A, TOKEN_A, inDays(180), s, NOW);
    expect(readGuestPass(CAFE_A, s, NOW)).toBe(TOKEN_A);
  });

  it('never hands back anything that is not shaped like a token (it goes into a request header)', () => {
    const s = store();
    for (const bad of ['', 'plain', 'a b.c.d', 'a.b.c\r\nX-Evil: 1', '<script>.b.c', 'a'.repeat(2000)]) {
      saveGuestPass(CAFE_A, bad, inDays(180), s, NOW);
      expect(readGuestPass(CAFE_A, s, NOW)).toBeNull();
    }
    // The same applies to something already sitting in storage.
    const tampered = store({
      [GUEST_PASS_KEY]: JSON.stringify({
        [CAFE_A]: { token: 'a.b.c\nX-Evil: 1', expiresAt: NOW + DAY },
      }),
    });
    expect(readGuestPass(CAFE_A, tampered, NOW)).toBeNull();
  });

  it('only keys passes by a real café id', () => {
    const s = store();
    for (const bad of ['', '__proto__', '../x', 'cafe a', 'z'.repeat(24)]) {
      saveGuestPass(bad, TOKEN_A, inDays(180), s, NOW);
      expect(readGuestPass(bad, s, NOW)).toBeNull();
    }
    expect(s.data[GUEST_PASS_KEY]).toBeUndefined();
  });

  it('pass storage tolerates throwing storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(readGuestPass(CAFE_A, blocked, NOW)).toBeNull();
    expect(() => saveGuestPass(CAFE_A, TOKEN_A, inDays(180), blocked, NOW)).not.toThrow();
    expect(() => forgetGuestPass(CAFE_A, blocked, NOW)).not.toThrow();
  });

  it('tolerates storage that is missing altogether (private window)', () => {
    expect(readGuestPass(CAFE_A, null, NOW)).toBeNull();
    expect(() => saveGuestPass(CAFE_A, TOKEN_A, inDays(180), null, NOW)).not.toThrow();
    expect(() => forgetGuestPass(CAFE_A, null, NOW)).not.toThrow();
  });
});
