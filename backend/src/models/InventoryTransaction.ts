import mongoose, { Schema, Document } from 'mongoose';

export type InventoryTransactionType = 'USAGE_AUTO' | 'PURCHASE' | 'WASTAGE' | 'ADJUSTMENT';

export interface IInventoryTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  inventoryItemId: mongoose.Types.ObjectId;
  type: InventoryTransactionType;
  quantityChanged: number; // positive for addition, negative for deduction
  balanceAfter: number;
  reason?: string;
  referenceOrderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    type: {
      type: String,
      enum: ['USAGE_AUTO', 'PURCHASE', 'WASTAGE', 'ADJUSTMENT'],
      required: true
    },
    quantityChanged: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, default: '' },
    referenceOrderId: { type: Schema.Types.ObjectId, ref: 'Order' }
  },
  { timestamps: true }
);

InventoryTransactionSchema.index({ tenantId: 1, createdAt: -1 });

export const InventoryTransaction = mongoose.model<IInventoryTransaction>(
  'InventoryTransaction',
  InventoryTransactionSchema
);
