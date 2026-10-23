import mongoose, { Schema, Document } from 'mongoose';

// The marketing site's own first-party analytics: one row per page view and per step of the
// request-a-demo quiz. Visitors are an anonymous random id the browser keeps (no cookie, no IP,
// no name), so this answers "how many people, when, from where, and where they gave up" without
// tracking anyone. Not tenant-scoped; only the Super Admin console reads it.
export type SiteEventType = 'pageview' | 'demo_step' | 'demo_answer' | 'demo_submit';

export const SITE_EVENT_TYPES: SiteEventType[] = ['pageview', 'demo_step', 'demo_answer', 'demo_submit'];

export type SiteDevice = 'mobile' | 'tablet' | 'desktop';

export interface ISiteEvent extends Document {
  type: SiteEventType;
  visitorId: string; // stays the same across visits from one browser
  sessionId: string; // one browser tab's visit
  path: string;
  referrer?: string; // external host only, e.g. `instagram.com`
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  device: SiteDevice;
  step?: string; // demo quiz: the question's key
  stepIndex?: number; // demo quiz: 0-based position of that question
  value?: string; // demo_answer: the chosen option's id
  createdAt: Date;
}

/** Rows older than this are deleted by Mongo itself (TTL index below). */
export const SITE_EVENT_RETENTION_DAYS = 400;

const SiteEventSchema = new Schema<ISiteEvent>(
  {
    type: { type: String, enum: SITE_EVENT_TYPES, required: true },
    visitorId: { type: String, required: true, maxlength: 64 },
    sessionId: { type: String, required: true, maxlength: 64 },
    path: { type: String, required: true, maxlength: 200 },
    referrer: { type: String, maxlength: 200 },
    utmSource: { type: String, maxlength: 100 },
    utmMedium: { type: String, maxlength: 100 },
    utmCampaign: { type: String, maxlength: 150 },
    device: { type: String, enum: ['mobile', 'tablet', 'desktop'], required: true },
    step: { type: String, maxlength: 40 },
    stepIndex: { type: Number, min: 0, max: 50 },
    value: { type: String, maxlength: 60 }
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

// Every report is "events of some types in a date range". The TTL index doubles as the range index
// for the all-types queries.
SiteEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: SITE_EVENT_RETENTION_DAYS * 24 * 60 * 60 });
SiteEventSchema.index({ type: 1, createdAt: 1 });

export const SiteEvent = mongoose.model<ISiteEvent>('SiteEvent', SiteEventSchema);
