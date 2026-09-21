import mongoose, { Schema, Document } from 'mongoose';

export type SupportTicketRaisedByType = 'CUSTOMER' | 'BUSINESS_OWNER';
export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// priority is a string enum, so it can't be sorted correctly with a plain {priority: -1} query
// (alphabetically "URGENT" < "LOW" < "MEDIUM" < "HIGH" descending — not the real severity order).
// priorityRank is a denormalized numeric mirror kept in sync by the pre-save hook below, used
// purely for sorting the admin queue by actual severity.
export const PRIORITY_RANK: Record<SupportTicketPriority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

export interface ISupportTicket extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  raisedByType: SupportTicketRaisedByType;
  raisedByUserId?: mongoose.Types.ObjectId; // set for BUSINESS_OWNER-raised tickets
  contactName: string;
  contactPhone: string;
  orderId?: mongoose.Types.ObjectId; // optional link, set when raised from an order context
  category: string; // validated against ../utils/supportCategories per raisedByType
  subCategory?: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  priorityRank: number;
  ticketNumber: string;
  assignedToUserId?: mongoose.Types.ObjectId;
  resolutionNote?: string;
  escalatedAt?: Date;
  escalatedByUserId?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    raisedByType: { type: String, enum: ['CUSTOMER', 'BUSINESS_OWNER'], required: true },
    raisedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    contactName: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    category: { type: String, required: true },
    subCategory: { type: String },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    priorityRank: { type: Number, default: PRIORITY_RANK.MEDIUM },
    ticketNumber: { type: String, required: true, unique: true },
    assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: { type: String, trim: true },
    escalatedAt: { type: Date },
    escalatedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

SupportTicketSchema.pre('save', function (next) {
  if (this.isModified('priority')) {
    this.priorityRank = PRIORITY_RANK[this.priority];
  }
  next();
});

// Super admin ticket queue's default filter/sort.
SupportTicketSchema.index({ businessId: 1, status: 1 });
SupportTicketSchema.index({ status: 1, priorityRank: -1, createdAt: -1 });
// Public "track my ticket" lookup by ticket number + phone.
SupportTicketSchema.index({ contactPhone: 1, createdAt: -1 });

export const SupportTicket = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
