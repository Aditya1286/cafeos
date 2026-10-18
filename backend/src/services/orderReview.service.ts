import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { ServiceError } from '../utils/serviceError';
import { REVIEW_TAGS, MAX_REVIEW_TAGS, MAX_REVIEW_COMMENT_LENGTH, ReviewTag } from '../constants/reviewTags';
import * as reviewDao from '../dao/orderReview.dao';

// Stars and a quick review after an order. Guests reach it by the order's Mongo _id only (like the
// tracking page), once the order has been served, and leave one review per order.

const OBJECT_ID = /^[0-9a-f]{24}$/i;
const REVIEWABLE_STATUSES = ['SERVED', 'COMPLETED'];

const loadOrder = async (orderId: unknown) => {
  const order = typeof orderId === 'string' && OBJECT_ID.test(orderId) ? await Order.findById(orderId) : null;
  if (!order) throw new ServiceError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  return order;
};

const isReviewable = (order: { orderStatus: string; refundedAt?: Date | null }) =>
  REVIEWABLE_STATUSES.includes(order.orderStatus) && !order.refundedAt;

const publicReview = (review: { rating: number; tags: string[]; comment: string; createdAt: Date }) => ({
  rating: review.rating,
  tags: review.tags,
  comment: review.comment,
  createdAt: review.createdAt
});

/** What the tracker needs to show the review card: whether the order can be reviewed yet, the
 * review already left (if any), and the reasons on offer. */
export const getOrderReview = async (orderId: unknown) => {
  const order = await loadOrder(orderId);
  const review = await reviewDao.findReviewByOrderId(order._id);
  return {
    eligible: !review && isReviewable(order),
    review: review ? publicReview(review) : null,
    tags: REVIEW_TAGS
  };
};

export interface ReviewInput {
  rating?: unknown;
  tags?: unknown;
  comment?: unknown;
}

const invalid = (message: string) => new ServiceError(400, 'VALIDATION_ERROR', message);

const parseInput = (input: ReviewInput): { rating: number; tags: string[]; comment: string } => {
  const { rating } = input;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw invalid('Please give a rating from 1 to 5 stars.');
  }

  const rawTags = input.tags ?? [];
  if (!Array.isArray(rawTags) || rawTags.length > MAX_REVIEW_TAGS || rawTags.some((t) => typeof t !== 'string')) {
    throw invalid(`Pick up to ${MAX_REVIEW_TAGS} reasons.`);
  }
  const tags = [...new Set(rawTags as string[])];
  const byId = new Map<string, ReviewTag>(REVIEW_TAGS.map((t) => [t.id, t]));
  for (const id of tags) {
    if (!byId.get(id)?.ratings.includes(rating)) throw invalid('One of the reasons does not fit this rating.');
  }

  const rawComment = input.comment ?? '';
  if (typeof rawComment !== 'string' || rawComment.trim().length > MAX_REVIEW_COMMENT_LENGTH) {
    throw invalid(`A comment can be at most ${MAX_REVIEW_COMMENT_LENGTH} characters.`);
  }
  return { rating, tags, comment: rawComment.trim() };
};

export const submitOrderReview = async (orderId: unknown, input: ReviewInput) => {
  const order = await loadOrder(orderId);
  if (!isReviewable(order)) {
    throw new ServiceError(409, 'ORDER_NOT_REVIEWABLE', 'You can review an order once it has been served.');
  }
  const parsed = parseInput(input);
  if (await reviewDao.findReviewByOrderId(order._id)) {
    throw new ServiceError(409, 'ALREADY_REVIEWED', 'You have already reviewed this order.');
  }
  try {
    const review = await reviewDao.createReview({
      businessId: order.businessId,
      orderId: order._id,
      ...parsed,
      customerName: order.customerName,
      productIds: order.items.map((item) => item.productId),
      orderTotalPaise: order.totalAmountPaise,
      tableName: order.tableName
    });
    return publicReview(review);
  } catch (error: any) {
    // Two taps at once: the unique index lets the first one through.
    if (error?.code === 11000) throw new ServiceError(409, 'ALREADY_REVIEWED', 'You have already reviewed this order.');
    throw error;
  }
};

const PAGE_SIZE = 20;

/** A café's reviews, newest first, with the star counts and most-ticked reasons across all of them. */
export const listBusinessReviews = async (businessId: mongoose.Types.ObjectId, page: unknown) => {
  const pageNumber = Math.max(1, Number.parseInt(String(page ?? '1'), 10) || 1);
  const [reviews, total, summary] = await Promise.all([
    reviewDao.listReviews(businessId, (pageNumber - 1) * PAGE_SIZE, PAGE_SIZE),
    reviewDao.countReviews(businessId),
    reviewDao.summarizeReviews(businessId)
  ]);
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of summary.stars) distribution[row._id] = row.count;
  const rated = Object.entries(distribution).reduce((sum, [stars, count]) => sum + Number(stars) * count, 0);
  const labelOf = new Map(REVIEW_TAGS.map((t) => [t.id, t]));
  return {
    summary: {
      count: total,
      average: total ? Math.round((rated / total) * 100) / 100 : 0,
      distribution,
      tags: summary.tags
        .filter((t) => labelOf.has(t._id))
        .map((t) => ({ id: t._id, label: labelOf.get(t._id)!.label, theme: labelOf.get(t._id)!.theme, count: t.count }))
        .sort((a, b) => b.count - a.count)
    },
    reviews: reviews.map((r) => ({ ...publicReview(r), _id: r._id, orderId: r.orderId, customerName: r.customerName, tableName: r.tableName, orderTotalPaise: r.orderTotalPaise })),
    pagination: { page: pageNumber, limit: PAGE_SIZE, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
  };
};
