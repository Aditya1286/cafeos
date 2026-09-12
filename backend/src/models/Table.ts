import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  tableNumber: string; // "Table 01"
  capacity: number;
  qrToken: string; // Unique public token for URL e.g. "tok_tbl_01_xyz"
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableNumber: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 4 },
    qrToken: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'], default: 'AVAILABLE' }
  },
  { timestamps: true }
);

TableSchema.index({ tenantId: 1, tableNumber: 1 });

export const Table = mongoose.model<ITable>('Table', TableSchema);
