import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  displayOrder: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true }
  },
  { timestamps: true }
);

CategorySchema.index({ businessId: 1, displayOrder: 1 });
// The public customer-facing menu (every QR scan) filters isAvailable and sorts by
// displayOrder — the index above can't serve the isAvailable equality + ordered sort together.
CategorySchema.index({ businessId: 1, isAvailable: 1, displayOrder: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
