import mongoose from 'mongoose';
import { GuestProfile, IGuestProfile } from '../models/GuestProfile';

// Pure data access for GuestProfile. The proof rules live in services/guestMemory.service.ts.

type Id = mongoose.Types.ObjectId | string;

export const findGuestProfile = (businessId: Id, phone: string): Promise<IGuestProfile | null> =>
  GuestProfile.findOne({ businessId, phone });

/** Creates or refreshes the profile on a proven visit. Answers and asked questions are kept. */
export const upsertGuestVisit = (
  businessId: Id,
  phone: string,
  fields: { firstName: string; lastVisitAt: Date; expireAt: Date }
): Promise<IGuestProfile | null> =>
  GuestProfile.findOneAndUpdate({ businessId, phone }, { $set: fields }, { upsert: true, new: true, setDefaultsOnInsert: true });

export const setLastWelcomeTemplate = async (profileId: Id, templateId: string): Promise<void> => {
  await GuestProfile.updateOne({ _id: profileId }, { $set: { lastWelcomeTemplateId: templateId } });
};

export const addAskedQuestion = async (profileId: Id, questionId: string): Promise<void> => {
  await GuestProfile.updateOne({ _id: profileId }, { $addToSet: { askedQuestionIds: questionId } });
};

export const setAnswer = async (businessId: Id, phone: string, questionId: string, optionId: string, at: Date): Promise<IGuestProfile | null> =>
  GuestProfile.findOneAndUpdate(
    { businessId, phone },
    { $set: { [`answers.${questionId}`]: { optionId, answeredAt: at } }, $addToSet: { askedQuestionIds: questionId } },
    { new: true }
  );
