import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  displayOrder: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true }
  },
  { timestamps: true }
);

CategorySchema.index({ tenantId: 1, displayOrder: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
