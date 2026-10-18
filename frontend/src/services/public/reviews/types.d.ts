import { ApiResponse } from '../../apiTypes';

/** One quick-pick reason (backend constants/reviewTags.ts). `ratings` are the star counts it is offered for. */
export interface ReviewTag {
  id: string;
  label: string;
  theme: 'food' | 'speed' | 'service' | 'ambience' | 'value' | 'cleanliness';
  ratings: number[];
}

export interface OrderReview {
  rating: number;
  tags: string[];
  comment: string;
  createdAt: string;
}

/** What the tracker needs: whether this order can be reviewed now, the review already left, the reasons on offer. */
export interface OrderReviewState {
  eligible: boolean;
  review: OrderReview | null;
  tags: ReviewTag[];
}

export interface SubmitReviewPayload {
  rating: number;
  tags: string[];
  comment?: string;
}

export type GetOrderReviewResponse = ApiResponse<OrderReviewState>;
export type SubmitOrderReviewResponse = ApiResponse<OrderReview>;
