import mongoose, { Schema, Document } from 'mongoose';

export type LedgerTransactionType = 
  | 'ORDER_PAYMENT' 
  | 'PLATFORM_FEE' 
  | 'BUSINESS_SETTLEMENT' 
  | 'SUBSCRIPTION_FEE' 
  | 'REFUND';

export type LedgerStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface IFinancialLedger extends Document {
  _id: mongoose.Types.ObjectId;
  transactionId: string; // Unique transaction identifier e.g. "TXN_98234723"
  businessId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  type: LedgerTransactionType;
  amountPaise: number;
  currency: string;
  status: LedgerStatus;
  paymentGatewayRef?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialLedgerSchema = new Schema<IFinancialLedger>(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    type: { 
      type: String, 
      enum: ['ORDER_PAYMENT', 'PLATFORM_FEE', 'BUSINESS_SETTLEMENT', 'SUBSCRIPTION_FEE', 'REFUND'], 
      required: true 
    },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['SUCCESS', 'PENDING', 'FAILED'], default: 'SUCCESS' },
    paymentGatewayRef: { type: String, default: '' },
    idempotencyKey: { type: String, sparse: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

FinancialLedgerSchema.index({ businessId: 1, createdAt: -1 });
FinancialLedgerSchema.index({ type: 1, createdAt: -1 });

export const FinancialLedger = mongoose.model<IFinancialLedger>('FinancialLedger', FinancialLedgerSchema);
