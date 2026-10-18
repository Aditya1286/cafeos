import { Request } from 'express';
import { AuthRequest } from '../middleware/auth';
import { serviceHandler } from '../utils/serviceHandler';
import * as reviewService from '../services/orderReview.service';

// Guest side (public routes, by the order's Mongo _id) and the café's own list.
export const getOrderReviewPublic = serviceHandler((req: Request) => reviewService.getOrderReview(req.params.id));

export const submitOrderReviewPublic = serviceHandler((req: Request) => reviewService.submitOrderReview(req.params.id, req.body ?? {}), {
  status: 201,
  message: 'Thanks for your feedback!'
});

export const listMyReviews = serviceHandler((req: AuthRequest) => reviewService.listBusinessReviews(req.businessId!, req.query.page));
