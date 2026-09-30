import mongoose, { Schema, Document } from 'mongoose';

// Bookkeeping for the demo café simulation. One document per demo café (key "cafe:<slug>")
// recording how far its orders have been generated, plus one "lock" document so two ticks never
// run at the same time.
export interface IDemoSimState extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  businessId?: mongoose.Types.ObjectId;
  // Every customer arrival up to this instant has been turned into an order.
  simulatedUntil?: Date;
  // The café definition's menuVersion last written to its menu; a newer one re-syncs the menu.
  menuVersion?: number;
  // When overdue platform fees were last settled for this café.
  lastSettledAt?: Date;
  // When old data was last pruned for this café (see ../prune.ts).
  lastPrunedAt?: Date;
  // The "lock" document only: a tick holds it until this instant.
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DemoSimStateSchema = new Schema<IDemoSimState>(
  {
    key: { type: String, required: true, unique: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
    simulatedUntil: { type: Date },
    menuVersion: { type: Number },
    lastSettledAt: { type: Date },
    lastPrunedAt: { type: Date },
    lockedUntil: { type: Date }
  },
  { timestamps: true }
);

export const DemoSimState = mongoose.model<IDemoSimState>('DemoSimState', DemoSimStateSchema);
