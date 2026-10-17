import mongoose, { Schema, Document } from 'mongoose';

// Café-identity engagement events (spec §11): what guests saw and tapped, for the super admin
// readout. Deliberately anonymous: no phone number, no name, nothing that identifies a guest. The
// kinds live in services/identityEvents.service.ts (IDENTITY_EVENT_KINDS).

/** Events are kept this long, then Mongo's TTL monitor deletes them. */
export const IDENTITY_EVENT_TTL_DAYS = 400;

export interface IIdentityEvent extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  kind: string;
  at: Date;
  orderId?: mongoose.Types.ObjectId;
  meta?: Record<string, string | number>;
}

const IdentityEventSchema = new Schema<IIdentityEvent>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    kind: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    meta: { type: Schema.Types.Mixed }
  },
  { versionKey: false }
);

// The readout counts one café's events by kind since a date.
IdentityEventSchema.index({ businessId: 1, at: -1 });
IdentityEventSchema.index({ at: 1 }, { expireAfterSeconds: IDENTITY_EVENT_TTL_DAYS * 24 * 60 * 60 });

export const IdentityEvent = mongoose.model<IIdentityEvent>('IdentityEvent', IdentityEventSchema);
