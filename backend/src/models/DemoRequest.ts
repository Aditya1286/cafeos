import mongoose, { Schema, Document } from 'mongoose';

// A lead from the marketing site's "Request a demo / start free trial" form. Not tenant-scoped
// (the visitor has no business yet) — only the Super Admin console reads these.
export type DemoRequestStatus = 'NEW' | 'CONTACTED' | 'TRIAL_STARTED' | 'WON' | 'LOST';

export const DEMO_REQUEST_STATUSES: DemoRequestStatus[] = ['NEW', 'CONTACTED', 'TRIAL_STARTED', 'WON', 'LOST'];

/** One tap-to-choose answer from the demo quiz, stored readable so the lead list and the email need
 * no copy of the quiz: the wording lives in the frontend (constants/demoFunnel.ts) and can change. */
export interface IDemoRequestAnswer {
  key: string; // the question's stable id, e.g. `rushPain`
  question: string; // short admin-facing title, e.g. "What slips first in a rush"
  value: string; // the chosen option's stable id, e.g. `orders-mixed`
  answer: string; // the option as the visitor saw it
}

/** Where the visitor came from, as the site's own analytics saw it (services/siteAnalytics.service.ts). */
export interface IDemoRequestSource {
  visitorId?: string;
  referrer?: string; // host only, e.g. `instagram.com`
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
}

export interface IDemoRequest extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  brandName: string;
  phone: string; // 10-digit Indian mobile, digits only
  email?: string;
  city: string;
  businessType?: string;
  message?: string;
  interestedPlan?: string; // which plan card the visitor clicked from, if any
  answers: IDemoRequestAnswer[];
  source?: IDemoRequestSource;
  consentToContact: boolean;
  status: DemoRequestStatus;
  adminNote?: string;
  contactedAt?: Date;
  handledByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DemoRequestSchema = new Schema<IDemoRequest>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    brandName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    businessType: { type: String, trim: true, maxlength: 60 },
    message: { type: String, trim: true, maxlength: 1000 },
    interestedPlan: { type: String, trim: true, maxlength: 40 },
    answers: {
      type: [
        {
          _id: false,
          key: { type: String, required: true, maxlength: 40 },
          question: { type: String, required: true, maxlength: 120 },
          value: { type: String, required: true, maxlength: 60 },
          answer: { type: String, required: true, maxlength: 160 }
        }
      ],
      default: []
    },
    source: {
      _id: false,
      visitorId: { type: String, maxlength: 64 },
      referrer: { type: String, maxlength: 200 },
      utmSource: { type: String, maxlength: 100 },
      utmMedium: { type: String, maxlength: 100 },
      utmCampaign: { type: String, maxlength: 150 },
      landingPath: { type: String, maxlength: 200 }
    },
    consentToContact: { type: Boolean, required: true },
    status: { type: String, enum: DEMO_REQUEST_STATUSES, default: 'NEW' },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    contactedAt: { type: Date },
    handledByUserId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// The admin list is filtered by status (the pipeline tabs) and always newest-first; the phone
// index backs the "same number asked again" duplicate check on submit.
DemoRequestSchema.index({ status: 1, createdAt: -1 });
DemoRequestSchema.index({ phone: 1, createdAt: -1 });

export const DemoRequest = mongoose.model<IDemoRequest>('DemoRequest', DemoRequestSchema);
