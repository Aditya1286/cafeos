import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

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
  role: UserRole;
  tenantId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
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
    role: { 
      type: String, 
      enum: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'INVENTORY_MANAGER'], 
      default: 'OWNER' 
    },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
  },
  { timestamps: true }
);

UserSchema.index({ tenantId: 1, role: 1 });

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
