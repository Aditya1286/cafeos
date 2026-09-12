import mongoose, { Schema, Document } from 'mongoose';

export interface IProductVariant {
  name: string; // e.g. "Small", "Regular", "Large"
  pricePaise: number;
}

export interface IProductAddon {
  name: string; // e.g. "Extra Cheese", "Shot of Espresso"
  pricePaise: number;
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
  isAvailable: boolean;
  isVeg: boolean;
  preparationTimeMinutes: number;
  displayOrder: number;
  variants: IProductVariant[];
  addons: IProductAddon[];
  discountPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    pricePaise: { type: Number, required: true }, // Store in paise (₹249 = 24900)
    imageUrl: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: true },
    preparationTimeMinutes: { type: Number, default: 15 },
    displayOrder: { type: Number, default: 0 },
    variants: [
      {
        name: { type: String, required: true },
        pricePaise: { type: Number, required: true }
      }
    ],
    addons: [
      {
        name: { type: String, required: true },
        pricePaise: { type: Number, required: true }
      }
    ],
    discountPercentage: { type: Number, default: 0 }
  },
  { timestamps: true }
);

ProductSchema.index({ tenantId: 1, categoryId: 1 });
ProductSchema.index({ tenantId: 1, isAvailable: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
