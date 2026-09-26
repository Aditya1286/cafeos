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
  taxRatePercentage: number; // 0 = GST disabled (current default); otherwise a restaurant GST slab — see utils/gst.ts
  perOrderFeePaise: number; // Legacy flat per-order fee (in paise) — superseded by commissionRatePercentage, kept for historical orders
  commissionRatePercentage: number; // e.g., 3 for 3% platform commission on the pre-tax order value
  remittanceCycleDays: number; // How often the business must remit accrued commission to the platform
  openingTime: string; // e.g. "09:00"
  closingTime: string; // e.g. "23:00"
  shortCode?: string;
  timezone?: string;
  upiVpa?: string; // Business's own UPI ID (e.g. "artisan@okhdfcbank") for the customer-facing QR/intent link
  tablesEnabled: boolean; // false for businesses with no physical seating (e.g. a kirana/general store) — skips table selection & occupancy limits entirely
  // The "master QR": the business's general menu link (/c/:slug), with no table in it. While
  // true, customers can order through it even when tables are on — as a counter order, no table.
  // Turned off, a table-using business only takes orders from table QRs. On by default; it only
  // matters while tablesEnabled is true (with tables off, the general link is how everyone orders).
  masterQrEnabled: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  // Internal/test account (set by a super admin). Its orders, revenue, and customers are left
  // out of platform-wide analytics when config.excludeDemoBusinessesFromAnalytics is on — the
  // business itself keeps working normally and still sees its own dashboard analytics.
  isDemo: boolean;
  // Optional SMEPay online checkout (services/checkout.service.ts). A super admin allows it per
  // business, then the owner switches it on once their SMEPay account is connected — customers
  // only see the option while both are true. Credentials live in SmepayAccount, not here,
  // because the public /c/:slug endpoint returns this document as-is.
  checkoutAllowed: boolean;
  checkoutEnabled: boolean;
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
    masterQrEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    isDemo: { type: Boolean, default: false },
    checkoutAllowed: { type: Boolean, default: false },
    checkoutEnabled: { type: Boolean, default: false },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' }
  },
  { timestamps: true }
);

BusinessSchema.index({ status: 1 });
// Super admin's businesses list sorts unfiltered by createdAt on nearly every dashboard load.
BusinessSchema.index({ createdAt: -1 });

export const Business = mongoose.model<IBusiness>('Business', BusinessSchema);
