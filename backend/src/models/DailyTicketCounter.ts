import mongoose, { Schema, Document } from 'mongoose';

export interface IDailyTicketCounter extends Document {
  businessId: mongoose.Types.ObjectId;
  dateKey: string; // Format: "YYYY-MM-DD" e.g., "2026-09-12"
  sequence: number;
  createdAt: Date;
  updatedAt: Date;
}

// Kept separate from DailyOrderCounter so ticket numbers don't share a sequence with order numbers.
const DailyTicketCounterSchema = new Schema<IDailyTicketCounter>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    dateKey: { type: String, required: true },
    sequence: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Concurrency-safe unique compound index per business + date
DailyTicketCounterSchema.index({ businessId: 1, dateKey: 1 }, { unique: true });

export const DailyTicketCounter = mongoose.model<IDailyTicketCounter>(
  'DailyTicketCounter',
  DailyTicketCounterSchema
);
