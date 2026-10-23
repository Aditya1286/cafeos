import { API_BASE_URL } from '../../api';
import { SiteEventPayload } from './types';

const ENDPOINT = `${API_BASE_URL}/public/site-events`;

/**
 * Fire-and-forget: analytics must never slow a page down or show an error. `sendBeacon` survives the
 * page being closed or navigated away from (the last quiz step, a tap on a link); `fetch` with
 * keepalive is the fallback where beacons are unavailable or refused.
 */
export const track = (event: SiteEventPayload): void => {
  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
  } catch {
    // fall back to fetch
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
};
