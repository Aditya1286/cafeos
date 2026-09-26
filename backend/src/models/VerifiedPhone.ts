import mongoose, { Schema, Document } from 'mongoose';

// Persisted "this phone passed OTP" records. Kept in Mongo rather than process memory so a
// restart/deploy doesn't silently un-verify every customer (and bill a fresh SMS for each),
// and so more than one backend instance can share them.
//
// - ORDER: long-lived, reusable, sliding window — gates guest order placement.
// - REGISTRATION: short-lived, single-use — gates owner account registration.
// - ACCOUNT: short-lived, single-use, and always from a fresh OTP — gates sensitive account
//   actions (password reset, email change) that prove control of the business phone number.
export type VerifiedPhonePurpose = 'ORDER' | 'REGISTRATION' | 'ACCOUNT';

export interface IVerifiedPhone extends Document {
  _id: mongoose.Types.ObjectId;
  mobile: string; // MSG91 format: country code + number, no '+', e.g. 919876543210
  purpose: VerifiedPhonePurpose;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerifiedPhoneSchema = new Schema<IVerifiedPhone>(
  {
    mobile: { type: String, required: true },
    purpose: { type: String, enum: ['ORDER', 'REGISTRATION', 'ACCOUNT'], required: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// One record per phone per purpose; every lookup is exactly this pair.
VerifiedPhoneSchema.index({ mobile: 1, purpose: 1 }, { unique: true });
// Mongo's TTL monitor deletes expired rows (it runs about once a minute, so reads still
// check expiresAt themselves rather than trusting the row's presence).
VerifiedPhoneSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerifiedPhone = mongoose.model<IVerifiedPhone>('VerifiedPhone', VerifiedPhoneSchema);
