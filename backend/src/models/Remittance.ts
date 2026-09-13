import mongoose, { Schema, Document } from 'mongoose';

export type RemittanceStatus = 'UNPAID' | 'PAID';

export interface IRemittance extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date; // exclusive
  dueDate: Date; // periodEnd + business.remittanceCycleDays
  ordersCount: number;
  grossAmountPaise: number; // sum of totalAmountPaise for orders in this period
  commissionOwedPaise: number; // sum of platformFeePaise for orders in this period
  status: RemittanceStatus;
  paidAt?: Date;
  paidAmountPaise?: number;
  markedPaidByUserId?: mongoose.Types.ObjectId;
  // Merchant's own "I've paid" claim via the UPI QR — informational only, never flips `status`.
  // Only a super admin confirming receipt (markRemittancePaid) does that; this just tells them
  // to go check the bank statement for this business's transfer.
  merchantMarkedPaidAt?: Date;
  merchantReportedUtr?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RemittanceSchema = new Schema<IRemittance>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    ordersCount: { type: Number, default: 0 },
    grossAmountPaise: { type: Number, default: 0 },
    commissionOwedPaise: { type: Number, default: 0 },
    status: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
    paidAt: { type: Date },
    paidAmountPaise: { type: Number },
    markedPaidByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    merchantMarkedPaidAt: { type: Date },
    merchantReportedUtr: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

RemittanceSchema.index({ businessId: 1, periodStart: 1 }, { unique: true });
RemittanceSchema.index({ businessId: 1, status: 1, dueDate: 1 });
// Super admin's cross-business remittance queue has no businessId filter at all — it's
// { status } sorted by dueDate (pending queue) or paidAt (settled log) — so the
// businessId-prefixed index above can't help it.
RemittanceSchema.index({ status: 1, dueDate: 1 });
RemittanceSchema.index({ status: 1, paidAt: -1 });

export const Remittance = mongoose.model<IRemittance>('Remittance', RemittanceSchema);
