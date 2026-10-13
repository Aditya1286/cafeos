import { describe, it, expect } from 'vitest';
import {
  RECOVERY_SESSIONS_KEY,
  clearRecoverySession,
  getRecoverySession,
  saveRecoverySession,
} from '../src/utils/recoverySession';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const HOUR = 3_600_000;
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
// Looks like the server's tokens: three base64url parts.
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJvcmRlci1yZWNvdmVyeSJ9.c2lnbmF0dXJl';
const session = (over: Record<string, unknown> = {}) => ({
  token: TOKEN,
  expiresAt: NOW + 12 * HOUR,
  phoneMask: '60••••••78',
  ...over,
});

describe('recovery session (the verified phone, kept on this device for a while)', () => {
  it('saves a session for a café and reads it back', () => {
    const s = store();
    saveRecoverySession('cafe-a', session(), s, NOW);
    expect(getRecoverySession('cafe-a', s, NOW)).toEqual(session());
  });

  it('is per café: a session for one café is not offered at another', () => {
    const s = store();
    saveRecoverySession('cafe-a', session(), s, NOW);
    expect(getRecoverySession('cafe-b', s, NOW)).toBeNull();
  });

  it('a newer session replaces the older one for the same café', () => {
    const s = store();
    saveRecoverySession('cafe-a', session({ phoneMask: '60••••••78' }), s, NOW);
    saveRecoverySession('cafe-a', session({ phoneMask: '98••••••21' }), s, NOW);
    expect(getRecoverySession('cafe-a', s, NOW)?.phoneMask).toBe('98••••••21');
  });

  it('an expired session is gone (and not kept around)', () => {
    const s = store();
    saveRecoverySession('cafe-a', session({ expiresAt: NOW + HOUR }), s, NOW);
    expect(getRecoverySession('cafe-a', s, NOW + HOUR - 1)).not.toBeNull();
    expect(getRecoverySession('cafe-a', s, NOW + HOUR)).toBeNull();
    saveRecoverySession('cafe-b', session(), s, NOW + 2 * HOUR); // writing prunes the expired one
    expect(Object.keys(JSON.parse(s.data[RECOVERY_SESSIONS_KEY]))).toEqual(['cafe-b']);
  });

  it('forgetting it ("not you?") clears just that café', () => {
    const s = store();
    saveRecoverySession('cafe-a', session(), s, NOW);
    saveRecoverySession('cafe-b', session(), s, NOW);
    clearRecoverySession('cafe-a', s, NOW);
    expect(getRecoverySession('cafe-a', s, NOW)).toBeNull();
    expect(getRecoverySession('cafe-b', s, NOW)).not.toBeNull();
  });

  it('never keeps the full phone number: only the masked form is stored', () => {
    const s = store();
    saveRecoverySession(
      'cafe-a',
      session({ phone: '6006646578', customerPhone: '6006646578' }),
      s,
      NOW,
    );
    expect(s.data[RECOVERY_SESSIONS_KEY]).not.toContain('6006646578');
  });

  it('refuses shapes the app never produces (it ends up in requests and on screen)', () => {
    const s = store();
    saveRecoverySession('cafe-a', session({ token: 'not a token' }), s, NOW);
    saveRecoverySession('cafe-a', session({ token: `${TOKEN}${'a'.repeat(1200)}` }), s, NOW);
    saveRecoverySession('cafe-a', session({ phoneMask: '<img src=x onerror=alert(1)>' }), s, NOW);
    saveRecoverySession('cafe-a', session({ expiresAt: 'tomorrow' }), s, NOW);
    saveRecoverySession('../evil', session(), s, NOW);
    expect(getRecoverySession('cafe-a', s, NOW)).toBeNull();
    expect(s.data[RECOVERY_SESSIONS_KEY]).toBeUndefined();
  });

  it('a corrupt, wrong-typed or tampered store reads as "no session" and never throws', () => {
    for (const raw of [
      '{not json',
      '[]',
      'null',
      '"x"',
      JSON.stringify({ 'cafe-a': { token: 5 } }),
    ]) {
      const s = store({ [RECOVERY_SESSIONS_KEY]: raw });
      expect(getRecoverySession('cafe-a', s, NOW)).toBeNull();
    }
  });

  it('works without storage at all (private windows) and when storage throws', () => {
    expect(getRecoverySession('cafe-a', null, NOW)).toBeNull();
    expect(() => saveRecoverySession('cafe-a', session(), null, NOW)).not.toThrow();
    expect(() => clearRecoverySession('cafe-a', null, NOW)).not.toThrow();
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(getRecoverySession('cafe-a', throwing, NOW)).toBeNull();
    expect(() => saveRecoverySession('cafe-a', session(), throwing, NOW)).not.toThrow();
  });
});
