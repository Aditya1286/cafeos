import mongoose, { Schema, Document } from 'mongoose';

export type SubscriptionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// A business's self-service request to move to a different plan. Same self-report-then-confirm
// shape as Remittance: the business claims to have paid (merchantMarkedPaidAt/Utr), but the
// plan change itself never applies until a super admin approves it.
export interface ISubscriptionUpgradeRequest extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amountPaise: number; // price snapshot at request time — a later plan price change never rewrites what was actually requested
  status: SubscriptionRequestStatus;
  merchantMarkedPaidAt?: Date;
  merchantReportedUtr?: string;
  reviewedAt?: Date;
  reviewedByUserId?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionUpgradeRequestSchema = new Schema<ISubscriptionUpgradeRequest>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    billingCycle: { type: String, enum: ['MONTHLY', 'ANNUAL'], default: 'MONTHLY' },
    amountPaise: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
    merchantMarkedPaidAt: { type: Date },
    merchantReportedUtr: { type: String, default: '' },
    reviewedAt: { type: Date },
    reviewedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, default: '' }
  },
  { timestamps: true }
);

SubscriptionUpgradeRequestSchema.index({ businessId: 1, status: 1 });
SubscriptionUpgradeRequestSchema.index({ status: 1, createdAt: 1 });

export const SubscriptionUpgradeRequest = mongoose.model<ISubscriptionUpgradeRequest>('SubscriptionUpgradeRequest', SubscriptionUpgradeRequestSchema);
