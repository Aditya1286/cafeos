import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyOrderCounter extends Document {
  tenantId: mongoose.Types.ObjectId;
  dateKey: string; // Format: "YYYY-MM-DD" e.g., "2026-09-12"
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyOrderCounterSchema = new Schema<IDailyOrderCounter>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    dateKey: { type: String, required: true },
    sequence: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Concurrency-safe unique compound index per cafe + date
DailyOrderCounterSchema.index({ tenantId: 1, dateKey: 1 }, { unique: true });

export const DailyOrderCounter = mongoose.model<IDailyOrderCounter>(
  'DailyOrderCounter',
  DailyOrderCounterSchema
);
