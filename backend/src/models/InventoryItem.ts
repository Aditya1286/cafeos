import mongoose, { Schema, Document } from 'mongoose';

export type InventoryUnit = 'KG' | 'GRAM' | 'LITER' | 'ML' | 'PIECE' | 'PACKET';

export interface IInventoryItem extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  name: string;
  unit: InventoryUnit;
  currentStock: number;
  minimumStockLevel: number;
  costPerUnitPaise: number;
  supplierName?: string;
  supplierContact?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    unit: { 
      type: String, 
      enum: ['KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'PACKET'], 
      required: true 
    },
    currentStock: { type: Number, required: true, default: 0 },
    minimumStockLevel: { type: Number, required: true, default: 5 },
    costPerUnitPaise: { type: Number, required: true, default: 0 },
    supplierName: { type: String, default: '' },
    supplierContact: { type: String, default: '' },
    status: { 
      type: String, 
      enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'], 
      default: 'IN_STOCK' 
    }
  },
  { timestamps: true }
);

InventoryItemSchema.index({ tenantId: 1, name: 1 });
InventoryItemSchema.index({ tenantId: 1, status: 1 });

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
