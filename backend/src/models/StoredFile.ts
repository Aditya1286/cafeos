import mongoose, { Schema, Document } from 'mongoose';

// Files kept in MongoDB by the 'mongo' storage driver (services/storage/mongo.driver.ts), served
// back through GET /api/v1/public/images/:id. It lives in the original `menuimages` collection
// so every image uploaded before the storage helper existed keeps its URL.
export type StorageFolder = 'menu' | 'avatars';

export interface IStoredFile extends Document {
  _id: mongoose.Types.ObjectId;
  businessId?: mongoose.Types.ObjectId; // absent for platform-level files (e.g. a super admin's avatar)
  folder: StorageFolder;
  contentType: string;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const StoredFileSchema = new Schema<IStoredFile>(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    folder: { type: String, enum: ['menu', 'avatars'], default: 'menu' },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true }
  },
  { timestamps: true, collection: 'menuimages' }
);

export const StoredFile = mongoose.model<IStoredFile>('StoredFile', StoredFileSchema);
