import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  currencySymbol: string;
  taxRatePercentage: number; // e.g., 5 for 5% GST
  perOrderFeePaise: number; // Default platform per-order fee (in paise, e.g. 200 = ₹2)
  openingTime: string; // e.g. "09:00"
  closingTime: string; // e.g. "23:00"
  shortCode?: string;
  timezone?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  subscriptionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String, default: '' },
    coverImageUrl: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    address: { type: String, required: true, trim: true },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    taxRatePercentage: { type: Number, default: 5 },
    perOrderFeePaise: { type: Number, default: 200 }, // ₹2
    openingTime: { type: String, default: '08:00' },
    closingTime: { type: String, default: '22:00' },
    shortCode: { type: String, default: 'ART' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' }
  },
  { timestamps: true }
);

RestaurantSchema.index({ status: 1 });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', RestaurantSchema);
