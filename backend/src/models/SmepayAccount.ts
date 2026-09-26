import mongoose, { Schema, Document } from 'mongoose';

// A café's own SMEPay merchant account, used for the optional online checkout
// (services/checkout.service.ts). Customers pay into this account and SMEPay settles to the
// café's bank — the platform never holds the money. Kept out of Business on purpose: the public
// /c/:slug endpoint returns the Business document as-is, and none of this should ever reach it.
//
// - NOT_STARTED: nothing set up yet.
// - KYC_PENDING: merchant created through the SMEPay Partner API, café still has to finish KYC
//   at kycUrl and paste its Wizard client id/secret.
// - CONNECTED: client id/secret verified against SMEPay's auth endpoint — checkout can be enabled.
export type SmepayOnboardingStatus = 'NOT_STARTED' | 'KYC_PENDING' | 'CONNECTED';

export interface ISmepayAccount extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  smepayBusinessId?: string; // SMEPay's merchant id, from the Partner API
  kycUrl?: string;
  onboardingStatus: SmepayOnboardingStatus;
  clientId?: string;
  clientSecretEnc?: string; // utils/secretBox.ts ciphertext — select:false, never sent to any client
  credentialsVerifiedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SmepayAccountSchema = new Schema<ISmepayAccount>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    smepayBusinessId: { type: String, default: '' },
    kycUrl: { type: String, default: '' },
    onboardingStatus: { type: String, enum: ['NOT_STARTED', 'KYC_PENDING', 'CONNECTED'], default: 'NOT_STARTED' },
    clientId: { type: String, default: '', trim: true },
    clientSecretEnc: { type: String, select: false },
    credentialsVerifiedAt: { type: Date },
    lastError: { type: String, default: '' }
  },
  { timestamps: true }
);

// One account per business; every lookup is by businessId.
SmepayAccountSchema.index({ businessId: 1 }, { unique: true });

export const SmepayAccount = mongoose.model<ISmepayAccount>('SmepayAccount', SmepayAccountSchema);
