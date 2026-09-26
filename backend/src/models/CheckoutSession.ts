import mongoose, { Schema, Document } from 'mongoose';
import { IOrderItemSnapshot, OrderSource } from './Order';

// A customer's in-progress SMEPay checkout (services/checkout.service.ts). Holds the fully
// validated, priced cart so that no Order exists — and nothing reaches the kitchen, analytics,
// table occupancy or the daily order sequence — until SMEPay confirms the payment. The session
// is then "finalized" into a normal PAID order.
//
// - PENDING: waiting on the customer / SMEPay.
// - FINALIZING: claimed by exactly one finalizer (see claimedAt) that's creating the order.
// - PAID: order created (orderId set).
// - EXPIRED: unpaid past expiresAt. Still checked for a while — a late SUCCESS still finalizes.
// - SWITCHED: the customer gave up on online checkout and placed a normal cash/direct-UPI order
//   instead (orderId set). A late SUCCESS marks that order paid rather than creating another.
export type CheckoutSessionStatus = 'PENDING' | 'FINALIZING' | 'PAID' | 'EXPIRED' | 'SWITCHED';

export interface ICheckoutAttempt {
  ref: string; // our order_id sent to SMEPay — "<sessionId>-<n>", unique per business
  smepayOrderId: string;
  slug: string; // SMEPay order_slug — what /order/validate takes
  paymentUrl: string;
  lastStatus: string; // last payment_status SMEPay reported
  createdAt: Date;
}

export interface ICheckoutDraft {
  tableName: string;
  source: OrderSource;
  items: IOrderItemSnapshot[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  platformFeePaise: number;
  totalAmountPaise: number;
  businessEarningsPaise: number;
  notes: string;
}

export interface ICheckoutSession extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  businessSlug: string;
  tableId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  draft: ICheckoutDraft;
  amountPaise: number;
  status: CheckoutSessionStatus;
  attempts: ICheckoutAttempt[];
  expiresAt: Date;
  lastCheckedAt?: Date;
  claimedAt?: Date;
  orderId?: mongoose.Types.ObjectId;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptSchema = new Schema<ICheckoutAttempt>(
  {
    ref: { type: String, required: true },
    smepayOrderId: { type: String, default: '' },
    slug: { type: String, required: true },
    paymentUrl: { type: String, required: true },
    lastStatus: { type: String, default: 'CREATED' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const DraftItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    pricePaise: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    variantName: { type: String, default: '' },
    addons: [{ _id: false, name: { type: String, required: true }, pricePaise: { type: Number, required: true } }],
    itemTotalPaise: { type: Number, required: true },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const DraftSchema = new Schema<ICheckoutDraft>(
  {
    tableName: { type: String, required: true },
    source: { type: String, enum: ['QR_TABLE', 'STAFF', 'TAKEAWAY', 'ADMIN'], required: true },
    items: [DraftItemSchema],
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, required: true },
    platformFeePaise: { type: Number, required: true },
    totalAmountPaise: { type: Number, required: true },
    businessEarningsPaise: { type: Number, required: true },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const CheckoutSessionSchema = new Schema<ICheckoutSession>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    businessSlug: { type: String, required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    draft: { type: DraftSchema, required: true },
    amountPaise: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'FINALIZING', 'PAID', 'EXPIRED', 'SWITCHED'],
      default: 'PENDING'
    },
    attempts: { type: [AttemptSchema], default: [] },
    expiresAt: { type: Date, required: true },
    lastCheckedAt: { type: Date },
    claimedAt: { type: Date },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    paidAt: { type: Date }
  },
  { timestamps: true }
);

// The background sweep (checkout.service.sweepOnce) is the only multi-document query: every
// session in a still-open status whose expiresAt falls inside the late-payment window, across
// all businesses — so no businessId prefix. Everything else is a single lookup by _id.
CheckoutSessionSchema.index({ status: 1, expiresAt: 1 });

export const CheckoutSession = mongoose.model<ICheckoutSession>('CheckoutSession', CheckoutSessionSchema);
