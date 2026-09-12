import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  _id: mongoose.Types.ObjectId;
  name: string; // 'Free' | 'Basic' | 'Premium' | 'Enterprise'
  code: string; // 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  description: string;
  monthlyPricePaise: number; // e.g. 79900 = ₹799
  annualPricePaise: number;  // e.g. 799000 = ₹7990
  perOrderFeePaise: number;  // e.g. 200 = ₹2/order
  limits: {
    maxTables: number;
    maxMenuItems: number;
    maxStaff: number;
    inventoryEnabled: boolean;
    analyticsAdvanced: boolean;
  };
  isPopular: boolean;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, required: true },
    monthlyPricePaise: { type: Number, required: true, default: 0 },
    annualPricePaise: { type: Number, required: true, default: 0 },
    perOrderFeePaise: { type: Number, required: true, default: 200 },
    limits: {
      maxTables: { type: Number, default: 10 },
      maxMenuItems: { type: Number, default: 50 },
      maxStaff: { type: Number, default: 3 },
      inventoryEnabled: { type: Boolean, default: false },
      analyticsAdvanced: { type: Boolean, default: false }
    },
    isPopular: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE' }
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
