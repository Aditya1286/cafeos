import mongoose, { Schema, Document } from 'mongoose';

// What a café remembers about one returning guest (spec §9.3), keyed by the café and the guest's
// verified phone (its last 10 digits, phoneKeyOf). Written only with proof that the guest's own device
// holds the phone (a fresh-OTP device proof or a guest pass, §10.4), never from a phone number alone.
// It expires 365 days after the guest's last visit at this café.

export interface IGuestAnswer {
  optionId: string;
  answeredAt: Date;
}

export interface IGuestProfile extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  phone: string;
  firstName: string;
  answers: Map<string, IGuestAnswer>;
  askedQuestionIds: string[];
  lastWelcomeTemplateId?: string;
  lastVisitAt: Date;
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IGuestAnswer>(
  {
    optionId: { type: String, required: true },
    answeredAt: { type: Date, required: true }
  },
  { _id: false }
);

const GuestProfileSchema = new Schema<IGuestProfile>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    phone: { type: String, required: true },
    firstName: { type: String, default: '' },
    answers: { type: Map, of: AnswerSchema, default: () => new Map() },
    askedQuestionIds: { type: [String], default: [] },
    lastWelcomeTemplateId: { type: String },
    lastVisitAt: { type: Date, required: true },
    expireAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// Every read and write is one guest at one café.
GuestProfileSchema.index({ businessId: 1, phone: 1 }, { unique: true });
GuestProfileSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const GuestProfile = mongoose.model<IGuestProfile>('GuestProfile', GuestProfileSchema);
