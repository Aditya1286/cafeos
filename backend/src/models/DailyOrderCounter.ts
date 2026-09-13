import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyOrderCounter extends Document {
  businessId: mongoose.Types.ObjectId;
  dateKey: string; // Format: "YYYY-MM-DD" e.g., "2026-09-12"
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const DailyOrderCounterSchema = new Schema<IDailyOrderCounter>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    dateKey: { type: String, required: true },
    sequence: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Concurrency-safe unique compound index per business + date
DailyOrderCounterSchema.index({ businessId: 1, dateKey: 1 }, { unique: true });

export const DailyOrderCounter = mongoose.model<IDailyOrderCounter>(
  'DailyOrderCounter',
  DailyOrderCounterSchema
);
