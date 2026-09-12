import mongoose, { Schema, Document } from 'mongoose';

export type OrderStatus = 
  | 'PLACED' 
  | 'CONFIRMED' 
  | 'PREPARING' 
  | 'READY' 
  | 'SERVED' 
  | 'COMPLETED' 
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';
export type PaymentMethod = 'ONLINE' | 'CASH' | 'UPI' | 'CARD';
export type OrderSource = 'QR_TABLE' | 'STAFF' | 'TAKEAWAY' | 'ADMIN';

export interface IOrderItemAddonSnapshot {
  name: string;
  pricePaise: number;
}

export interface IOrderItemSnapshot {
  productId: mongoose.Types.ObjectId;
  name: string;
  pricePaise: number; // Snapshot of unit price at order time
  quantity: number;
  variantName?: string;
  addons?: IOrderItemAddonSnapshot[];
  itemTotalPaise: number;
  notes?: string;
}

export interface IOrderTimeline {
  placedAt?: Date;
  acceptedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: string; // Unique human-readable daily ID e.g., "ART-120926-0001"
  orderNumber: string; // Display number string e.g. "ART-120926-0001" or "#1042"
  tenantId: mongoose.Types.ObjectId;
  dateKey?: string; // Format: "YYYY-MM-DD"
  sequenceNumber?: number; // Daily sequence number
  tableId: mongoose.Types.ObjectId;
  tableName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  source: OrderSource;
  items: IOrderItemSnapshot[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  platformFeePaise: number; // Fixed platform fee e.g. ₹2 = 200 paise
  serviceChargePaise: number;
  totalAmountPaise: number;
  restaurantEarningsPaise: number; // totalAmountPaise - platformFeePaise
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  idempotencyKey?: string;
  notes?: string;
  timeline?: IOrderTimeline;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItemSnapshot>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  pricePaise: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  variantName: { type: String, default: '' },
  addons: [
    {
      name: { type: String, required: true },
      pricePaise: { type: Number, required: true }
    }
  ],
  itemTotalPaise: { type: Number, required: true },
  notes: { type: String, default: '' }
});

const TimelineSchema = new Schema<IOrderTimeline>({
  placedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  preparingAt: { type: Date },
  readyAt: { type: Date },
  completedAt: { type: Date },
  cancelledAt: { type: Date }
});

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    dateKey: { type: String, index: true },
    sequenceNumber: { type: Number },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    tableName: { type: String, required: true },
    customerName: { type: String, required: true, trim: true, index: true },
    customerPhone: { type: String, required: true, trim: true, index: true },
    customerEmail: { type: String, default: '' },
    source: {
      type: String,
      enum: ['QR_TABLE', 'STAFF', 'TAKEAWAY', 'ADMIN'],
      default: 'QR_TABLE'
    },
    items: [OrderItemSchema],
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, required: true, default: 0 },
    platformFeePaise: { type: Number, required: true, default: 200 },
    serviceChargePaise: { type: Number, default: 0 },
    totalAmountPaise: { type: Number, required: true },
    restaurantEarningsPaise: { type: Number, required: true },
    orderStatus: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
      default: 'PLACED',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID', 'REFUNDED', 'FAILED'],
      default: 'UNPAID',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'CASH', 'UPI', 'CARD'],
      default: 'ONLINE'
    },
    transactionId: { type: String, default: '' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    notes: { type: String, default: '' },
    timeline: { type: TimelineSchema, default: () => ({ placedAt: new Date() }) },
    cancellationReason: { type: String, default: '' }
  },
  { timestamps: true }
);

// Indexes for fast multi-tenant order searching and filtering
OrderSchema.index({ tenantId: 1, orderId: 1 });
OrderSchema.index({ tenantId: 1, createdAt: -1 });
OrderSchema.index({ tenantId: 1, orderStatus: 1 });
OrderSchema.index({ tenantId: 1, paymentStatus: 1 });
OrderSchema.index({ tenantId: 1, customerPhone: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
