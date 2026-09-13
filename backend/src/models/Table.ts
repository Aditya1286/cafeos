import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  tableNumber: string; // "Table 01"
  capacity: number;
  qrToken: string; // Unique public token for URL e.g. "tok_tbl_01_xyz"
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  isActive: boolean; // false = QR disabled — stops accepting new orders but keeps history & the row itself
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    tableNumber: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 4 },
    qrToken: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'], default: 'AVAILABLE' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

TableSchema.index({ businessId: 1, tableNumber: 1 });
// Owner dashboard's occupancy count ({ businessId, status: 'OCCUPIED' }) on every analytics load.
TableSchema.index({ businessId: 1, status: 1 });

export const Table = mongoose.model<ITable>('Table', TableSchema);
