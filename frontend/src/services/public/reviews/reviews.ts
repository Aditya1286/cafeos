import { apiRequest } from '../../api';
import type {
  GetOrderReviewResponse,
  SubmitOrderReviewResponse,
  SubmitReviewPayload,
} from './types';

/** Whether this order can be reviewed yet, the review already left, and the reasons on offer. */
export const get = (orderId: string): Promise<GetOrderReviewResponse> =>
  apiRequest(`/public/orders/${orderId}/review`);

/** Stars, ticked reasons and an optional comment: one review per order, once it has been served. */
export const submit = (
  orderId: string,
  payload: SubmitReviewPayload,
): Promise<SubmitOrderReviewResponse> =>
  apiRequest(`/public/orders/${orderId}/review`, 'POST', payload);
