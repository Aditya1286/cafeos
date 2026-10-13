import mongoose from 'mongoose';
import { Order, IOrder } from '../models/Order';

// Pure data-access for order recovery — no validation or business rules here, that lives in
// ../services/orderRecovery.service.ts.

/** A café's orders placed at or after `since` whose stored phone matches `phonePattern`, newest
 * first. The pattern (not an exact value) is what lets "9876543210", "+91 98765 43210" and
 * "919876543210" all find the same customer; the createdAt window keeps the set it runs over small. */
export const findRecentOrdersByPhonePattern = (
  businessId: mongoose.Types.ObjectId,
  phonePattern: RegExp,
  since: Date,
  limit: number
): Promise<IOrder[]> =>
  Order.find({ businessId, createdAt: { $gte: since }, customerPhone: phonePattern })
    .sort({ createdAt: -1 })
    .limit(limit);
