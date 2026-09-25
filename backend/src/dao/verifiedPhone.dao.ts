import { VerifiedPhone, IVerifiedPhone, VerifiedPhonePurpose } from '../models/VerifiedPhone';

// Pure data-access layer for VerifiedPhone — no validation or business rules here,
// that lives in ../services/otp.service.ts.

export const upsertVerifiedPhone = (
  mobile: string,
  purpose: VerifiedPhonePurpose,
  expiresAt: Date
): Promise<IVerifiedPhone | null> =>
  VerifiedPhone.findOneAndUpdate({ mobile, purpose }, { $set: { expiresAt } }, { upsert: true, new: true });

export const findActiveVerifiedPhone = (
  mobile: string,
  purpose: VerifiedPhonePurpose,
  now: Date
): Promise<IVerifiedPhone | null> => VerifiedPhone.findOne({ mobile, purpose, expiresAt: { $gt: now } });

export const deleteVerifiedPhone = async (mobile: string, purpose: VerifiedPhonePurpose): Promise<void> => {
  await VerifiedPhone.deleteOne({ mobile, purpose });
};
