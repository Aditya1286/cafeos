import { apiRequest } from '../../api';
import type { AnswerResponse, GetWhileYouWaitResponse } from './types';

const guestHeader = (guestToken: string | null): Record<string, string> =>
  guestToken ? { 'X-Guest-Token': guestToken } : {};

/** Pairings and the daily question while the order is PLACED or PREPARING (empty otherwise). */
export const get = (orderId: string): Promise<GetWhileYouWaitResponse> =>
  apiRequest(`/public/orders/${orderId}/while-you-wait`);

/** The guest's one-tap answer. Only the phone that placed the order (its guest pass) may answer. */
export const answer = (
  orderId: string,
  guestToken: string | null,
  body: { questionId: string; optionId: string },
): Promise<AnswerResponse> =>
  apiRequest(`/public/orders/${orderId}/answer`, 'POST', body, guestHeader(guestToken));

/**
 * Adds a pairing to this same order (the amend flow). The response is the order without the phone,
 * not the tracker's shape: refetch the tracker afterwards.
 */
export const addItems = (
  orderId: string,
  guestToken: string | null,
  items: { productId: string; quantity: number }[],
): Promise<unknown> =>
  apiRequest(
    `/public/orders/${orderId}/add-items`,
    'POST',
    { items, source: 'pairing' },
    guestHeader(guestToken),
  );
