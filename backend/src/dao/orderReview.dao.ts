import mongoose from 'mongoose';
import { OrderReview, IOrderReview } from '../models/OrderReview';

// Pure data-access layer for OrderReview: no validation or business rules here, that lives in
// ../services/orderReview.service.ts.

export const findReviewByOrderId = (orderId: mongoose.Types.ObjectId | string): Promise<IOrderReview | null> =>
  OrderReview.findOne({ orderId });

export const createReview = (input: {
  businessId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  rating: number;
  tags: string[];
  comment: string;
  customerName: string;
  productIds: mongoose.Types.ObjectId[];
  orderTotalPaise: number;
  tableName?: string;
}): Promise<IOrderReview> => OrderReview.create(input);

export const listReviews = (businessId: mongoose.Types.ObjectId, skip: number, limit: number): Promise<IOrderReview[]> =>
  OrderReview.find({ businessId }).sort({ createdAt: -1 }).skip(skip).limit(limit);

export const countReviews = (businessId: mongoose.Types.ObjectId): Promise<number> => OrderReview.countDocuments({ businessId });

/** Star counts (1..5) and the number of times each reason was ticked, for one café. */
export const summarizeReviews = async (
  businessId: mongoose.Types.ObjectId
): Promise<{ stars: { _id: number; count: number }[]; tags: { _id: string; count: number }[] }> => {
  const [stars, tags] = await Promise.all([
    OrderReview.aggregate([{ $match: { businessId } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
    OrderReview.aggregate([{ $match: { businessId } }, { $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }])
  ]);
  return { stars, tags };
};
