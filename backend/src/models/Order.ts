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
export type PaymentMethod = 'ONLINE' | 'CASH' | 'CARD';
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
  businessId: mongoose.Types.ObjectId;
  dateKey?: string; // Format: "YYYY-MM-DD"
  sequenceNumber?: number; // Daily sequence number
  tableId?: mongoose.Types.ObjectId; // absent for businesses with tablesEnabled=false (counter/takeaway orders)
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
  businessEarningsPaise: number; // totalAmountPaise - platformFeePaise
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  idempotencyKey?: string;
  notes?: string;
  timeline?: IOrderTimeline;
  cancellationReason?: string;
  customerMarkedPaidAt?: Date;
  // Owner/staff manually verifying a payment happened (cash handed over at the counter, or an
  // online payment the customer claims but hasn't yet been confirmed by advancing the order to
  // SERVED/COMPLETED). Independent of `customerMarkedPaidAt`, which is only the customer's own
  // unverified claim.
  paymentConfirmedAt?: Date;
  paymentConfirmedByUserId?: mongoose.Types.ObjectId;
  // Refund lifecycle — money never flows through the platform (see the PAID ledger comment in
  // orderController.updateOrderStatus), so a refund is always a manual UPI/cash transfer the
  // business makes on their own. These fields just track that request-then-confirm handshake:
  // the customer flags a paid-then-cancelled order for a refund, and the business marks it
  // done once they've actually sent the money back.
  refundRequestedAt?: Date;
  refundReason?: string;
  refundedAt?: Date;
  refundedByUserId?: mongoose.Types.ObjectId;
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
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    dateKey: { type: String, index: true },
    sequenceNumber: { type: Number },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
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
    businessEarningsPaise: { type: Number, required: true },
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
      enum: ['ONLINE', 'CASH', 'CARD'],
      default: 'ONLINE'
    },
    transactionId: { type: String, default: '' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    notes: { type: String, default: '' },
    timeline: { type: TimelineSchema, default: () => ({ placedAt: new Date() }) },
    cancellationReason: { type: String, default: '' },
    customerMarkedPaidAt: { type: Date },
    paymentConfirmedAt: { type: Date },
    paymentConfirmedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    refundRequestedAt: { type: Date },
    refundReason: { type: String, default: '' },
    refundedAt: { type: Date },
    refundedByUserId: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// Indexes for fast multi-tenant order searching and filtering
OrderSchema.index({ businessId: 1, orderId: 1 });
OrderSchema.index({ businessId: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, orderStatus: 1 });
OrderSchema.index({ businessId: 1, paymentStatus: 1 });
OrderSchema.index({ businessId: 1, customerPhone: 1, createdAt: -1 });
// Backs every "paid orders in [start, end)" aggregation for one business — owner analytics
// (today/week/previous-week sales, daily sales chart), remittance period generation and
// summaries, and the per-business hourly revenue heatmap all match on exactly these three
// fields, several of them in tight loops (one per historical billing period).
OrderSchema.index({ businessId: 1, paymentStatus: 1, createdAt: 1 });
// A table can only host one active order at a time — checked on every new order placement
// via { tableId, orderStatus: { $nin: [...] } }, previously with no supporting index at all.
OrderSchema.index({ tableId: 1, orderStatus: 1 });
// Super admin's platform-wide "recent orders" feed has no businessId filter, so none of the
// businessId-prefixed indexes above can serve it — needs its own top-level recency index.
OrderSchema.index({ createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
