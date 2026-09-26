import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { phoneKeyOf } from '../utils/phone';

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'OWNER' 
  | 'MANAGER' 
  | 'RECEPTIONIST' 
  | 'STAFF' 
  | 'INVENTORY_MANAGER';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  // phone's last 10 digits (utils/phone.ts) — what "sign in with your number" looks up. Kept in
  // sync on save below; code that changes `phone` through an update query must set it too.
  phoneKey?: string;
  role: UserRole;
  businessId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
  isAvailableForCalls: boolean; // SUPER_ADMIN only — self-toggled support-call availability
  avatarUrl?: string; // profile picture, stored via services/storage
  // Set whenever the password changes (reset, change, or an owner resetting a staff member's):
  // every login token issued before this moment stops working — see utils/authToken.ts.
  passwordChangedAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    phoneKey: { type: String, index: true },
    role: { 
      type: String, 
      enum: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'INVENTORY_MANAGER'], 
      default: 'OWNER' 
    },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    isAvailableForCalls: { type: Boolean, default: true },
    avatarUrl: { type: String, default: '' },
    passwordChangedAt: { type: Date }
  },
  { timestamps: true }
);

UserSchema.index({ businessId: 1, role: 1 });
// Support call-routing's lookup for a free SUPER_ADMIN agent.
UserSchema.index({ role: 1, isAvailableForCalls: 1 });

UserSchema.pre('save', function (next) {
  if (this.isModified('phone')) {
    this.phoneKey = phoneKeyOf(this.phone) || undefined;
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
