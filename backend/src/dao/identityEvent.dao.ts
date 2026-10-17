import mongoose from 'mongoose';
import { IdentityEvent } from '../models/IdentityEvent';

// Pure data-access layer for IdentityEvent: no validation or business rules here, that lives in
// ../services/identityEvents.service.ts.

export const insertIdentityEvent = async (event: {
  businessId: mongoose.Types.ObjectId;
  kind: string;
  at: Date;
  orderId?: mongoose.Types.ObjectId;
  meta?: Record<string, string | number>;
}): Promise<void> => {
  await IdentityEvent.create(event);
};

/** Each café's event counts by kind since `since`. */
export const countIdentityEventsByKind = (
  businessIds: mongoose.Types.ObjectId[],
  since: Date
): Promise<{ _id: { businessId: mongoose.Types.ObjectId; kind: string }; count: number }[]> =>
  IdentityEvent.aggregate([
    { $match: { businessId: { $in: businessIds }, at: { $gte: since } } },
    { $group: { _id: { businessId: '$businessId', kind: '$kind' }, count: { $sum: 1 } } }
  ]);
