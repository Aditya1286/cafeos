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
  businessId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  pricePaise: number;
  imageUrl: string;
  isAvailable: boolean;
  // Distinct from isAvailable ("temporarily off the menu, owner can still see & restore
  // it") — this is "deleted" from the owner's own product list too, while the document
  // itself is kept (never hard-deleted, since past orders still reference this productId).
  isDeleted: boolean;
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
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    pricePaise: { type: Number, required: true }, // Store in paise (₹249 = 24900)
    imageUrl: { type: String, default: '' },
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
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

ProductSchema.index({ businessId: 1, categoryId: 1 });
// Owner's admin product listing excludes isDeleted and sorts by displayOrder.
ProductSchema.index({ businessId: 1, isDeleted: 1, displayOrder: 1 });
// The public customer-facing menu (every QR scan) filters isAvailable and sorts by
// displayOrder together — supersedes the old { businessId, isAvailable } pair index, which
// no query used without also wanting this sort.
ProductSchema.index({ businessId: 1, isAvailable: 1, displayOrder: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
