import mongoose, { Schema, Document } from 'mongoose';
import { MAX_REVIEW_COMMENT_LENGTH } from '../constants/reviewTags';

// A guest's stars and quick review of one order (services/orderReview.service.ts). One per order.
// It keeps what a café will want to count later: the rating, the ticked reasons (ids from
// constants/reviewTags.ts), an optional comment, and a snapshot of what was in the order, so reviews
// can be cut by dish, by day or by table without joining back to the order.

export interface IOrderReview extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  rating: number; // 1..5
  tags: string[];
  comment: string;
  customerName: string;
  productIds: mongoose.Types.ObjectId[];
  orderTotalPaise: number;
  tableName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderReviewSchema = new Schema<IOrderReview>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    tags: { type: [String], default: [] },
    comment: { type: String, default: '', maxlength: MAX_REVIEW_COMMENT_LENGTH },
    customerName: { type: String, default: '' },
    productIds: { type: [Schema.Types.ObjectId], default: [] },
    orderTotalPaise: { type: Number, default: 0 },
    tableName: { type: String }
  },
  { timestamps: true }
);

// One review per order; the café's list reads newest first.
OrderReviewSchema.index({ orderId: 1 }, { unique: true });
OrderReviewSchema.index({ businessId: 1, createdAt: -1 });

export const OrderReview = mongoose.model<IOrderReview>('OrderReview', OrderReviewSchema);
