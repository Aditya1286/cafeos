import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  businessId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userEmail: string;
  action: string; // e.g. "PRODUCT_PRICE_UPDATED", "BUSINESS_SUSPENDED", "ORDER_REFUNDED"
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ businessId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
