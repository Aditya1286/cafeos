import nconf from 'nconf';
import { config } from '../config';

// The demo cafés' settings, read straight from nconf (the same config.<env>.json / CLI args as the
// rest of the app, loaded by ../config) so nothing outside src/demo needs to know about them.
// Read on every call rather than once at import, so a changed setting needs no code path reload.
//
//   DEMO_TICK_KEY          secret for the X-Demo-Key header; unset or < 24 chars = demo switched off
//   DEMO_ACCOUNT_PASSWORD  password given to each demo café's owner and kitchen logins (≥ 8 chars)
//   DEMO_BACKFILL_DAYS     days of order history a newly created demo café starts with (default 30)
//   DEMO_KEEP_DAYS         older demo data is pruned once a day (default 45, at least 35 so every
//                          dashboard window stays covered)
//   DEMO_API_BASE_URL      where the kitchen bot reaches this backend's own API
//                          (default http://127.0.0.1:<PORT>/api/v1)
const MIN_TICK_KEY_LENGTH = 24;

export const demoConfig = () => ({
  tickKey: String(nconf.get('DEMO_TICK_KEY') || ''),
  accountPassword: String(nconf.get('DEMO_ACCOUNT_PASSWORD') || ''),
  backfillDays: Math.max(1, Math.min(120, Number(nconf.get('DEMO_BACKFILL_DAYS')) || 30)),
  keepDays: Math.max(35, Number(nconf.get('DEMO_KEEP_DAYS')) || 45),
  apiBaseUrl: String(nconf.get('DEMO_API_BASE_URL') || `http://127.0.0.1:${Number(config.port) || 5000}/api/v1`).replace(/\/$/, '')
});

export const isDemoEnabled = () => demoConfig().tickKey.length >= MIN_TICK_KEY_LENGTH;
