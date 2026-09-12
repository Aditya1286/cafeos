import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  recipientRole?: string; // 'OWNER' | 'RECEPTIONIST' | 'ALL'
  title: string;
  message: string;
  type: 'ORDER' | 'INVENTORY' | 'SYSTEM' | 'BILLING';
  isRead: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    recipientRole: { type: String, default: 'ALL' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['ORDER', 'INVENTORY', 'SYSTEM', 'BILLING'], default: 'ORDER' },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: '' }
  },
  { timestamps: true }
);

NotificationSchema.index({ businessId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
