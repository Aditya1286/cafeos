import { useCallback, useEffect, useState } from 'react';
import reviewsService, { type OrderReviewState } from '@/services/public/reviews';

// The review card on the order tracker: loads once the order has been served (the status flips live
// on the page, so the card appears as it does), and submits one review.

export const REVIEWABLE_STATUSES = ['SERVED', 'COMPLETED'];

export interface OrderReviewHook {
  /** Null until loaded, or while the order is not yet served. */
  state: OrderReviewState | null;
  submitting: boolean;
  /** Rejects with the server's message on failure. */
  submit: (rating: number, tags: string[], comment: string) => Promise<void>;
}

export const useOrderReview = (orderId: string, orderStatus: string): OrderReviewHook => {
  const servable = !!orderId && REVIEWABLE_STATUSES.includes(orderStatus);
  const [state, setState] = useState<OrderReviewState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!servable) {
      setState(null);
      return;
    }
    let cancelled = false;
    reviewsService
      .get(orderId)
      .then((res) => !cancelled && setState(res.data))
      .catch(() => !cancelled && setState(null)); // no card is better than a broken one
    return () => {
      cancelled = true;
    };
  }, [orderId, servable]);

  const submit = useCallback(
    async (rating: number, tags: string[], comment: string) => {
      setSubmitting(true);
      try {
        const res = await reviewsService.submit(orderId, { rating, tags, comment });
        setState((prev) => (prev ? { ...prev, eligible: false, review: res.data } : prev));
      } finally {
        setSubmitting(false);
      }
    },
    [orderId],
  );

  return { state, submitting, submit };
};
