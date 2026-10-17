import { apiRequest } from '../../api';
import type { GuestWelcome, IdentityEventPayload } from './types';

/**
 * The returning-guest welcome for this device's pass at one café, or null when there is none to
 * give (the server answers 204: no pass, a pass for another café, identity off, nothing remembered).
 */
export const getWelcome = async (businessId: string, guestToken: string): Promise<GuestWelcome | null> => {
  const res = await apiRequest(`/public/c/${businessId}/welcome`, 'GET', undefined, {
    'X-Guest-Token': guestToken,
  });
  const data = res?.data;
  return data && typeof data.line === 'string' && data.line.trim() ? data : null;
};

/** Fire-and-forget: an engagement event never fails or slows the page. */
export const recordEvent = (payload: IdentityEventPayload): void => {
  apiRequest('/public/identity-events', 'POST', payload).catch(() => {});
};
