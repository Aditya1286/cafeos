import mongoose, { Schema, Document } from 'mongoose';

export interface IBusiness extends Document {
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
  taxRatePercentage: number; // 0 = GST disabled (current default); e.g., 5 for 5% GST when re-enabled
  perOrderFeePaise: number; // Legacy flat per-order fee (in paise) — superseded by commissionRatePercentage, kept for historical orders
  commissionRatePercentage: number; // e.g., 3 for 3% platform commission on the pre-tax order value
  remittanceCycleDays: number; // How often the business must remit accrued commission to the platform
  openingTime: string; // e.g. "09:00"
  closingTime: string; // e.g. "23:00"
  shortCode?: string;
  timezone?: string;
  upiVpa?: string; // Business's own UPI ID (e.g. "artisan@okhdfcbank") for the customer-facing QR/intent link
  tablesEnabled: boolean; // false for businesses with no physical seating (e.g. a kirana/general store) — skips table selection & occupancy limits entirely
  status: 'ACTIVE' | 'SUSPENDED';
  // Internal/test account (set by a super admin). Its orders, revenue, and customers are left
  // out of platform-wide analytics when config.excludeDemoBusinessesFromAnalytics is on — the
  // business itself keeps working normally and still sees its own dashboard analytics.
  isDemo: boolean;
  subscriptionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessSchema = new Schema<IBusiness>(
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
    taxRatePercentage: { type: Number, default: 0 },
    perOrderFeePaise: { type: Number, default: 200 }, // ₹2 (legacy, no longer used for new orders)
    commissionRatePercentage: { type: Number, default: 3 },
    remittanceCycleDays: { type: Number, default: 7 },
    openingTime: { type: String, default: '08:00' },
    closingTime: { type: String, default: '22:00' },
    shortCode: { type: String, default: 'BIZ' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    upiVpa: { type: String, default: '', trim: true },
    tablesEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    isDemo: { type: Boolean, default: false },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' }
  },
  { timestamps: true }
);

BusinessSchema.index({ status: 1 });
// Super admin's businesses list sorts unfiltered by createdAt on nearly every dashboard load.
BusinessSchema.index({ createdAt: -1 });

export const Business = mongoose.model<IBusiness>('Business', BusinessSchema);
