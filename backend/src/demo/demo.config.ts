import { demo, server } from '../config';

// The demo cafés' settings — the `demo` section of config.<env>.json (see config/types.ts for
// what each key means), clamped here so nothing outside src/demo needs to know about them.
// Read on every call rather than once at import, so a changed setting needs no code path reload.
const MIN_TICK_KEY_LENGTH = 24;

export const demoConfig = () => ({
  tickKey: demo.tickKey,
  accountPassword: demo.accountPassword,
  backfillDays: Math.max(1, Math.min(120, demo.backfillDays)),
  keepDays: Math.max(35, demo.keepDays),
  apiBaseUrl: (demo.apiBaseUrl || `http://127.0.0.1:${server.port}/api/v1`).replace(/\/$/, '')
});

export const isDemoEnabled = () => demoConfig().tickKey.length >= MIN_TICK_KEY_LENGTH;
