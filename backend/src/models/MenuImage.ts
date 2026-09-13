import mongoose, { Schema, Document } from 'mongoose';

// v1 image storage: no cloud/object storage yet, so uploaded menu images are
// kept as raw bytes right in Mongo and streamed back through getMenuImage.
export interface IMenuImage extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  contentType: string;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const MenuImageSchema = new Schema<IMenuImage>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true }
  },
  { timestamps: true }
);

export const MenuImage = mongoose.model<IMenuImage>('MenuImage', MenuImageSchema);
