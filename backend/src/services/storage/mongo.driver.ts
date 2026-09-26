import mongoose from 'mongoose';
import { StoredFile, IStoredFile } from '../../models/StoredFile';
import { StorageDriver } from './storage.types';

// Keeps file bytes in MongoDB. Simple and dependency-free, but every image request hits the
// database — fine for small volumes, which is why S3 exists as the other driver.
const URL_PREFIX = '/api/v1/public/images/';

export const mongoDriver: StorageDriver = {
  name: 'mongo',

  async put({ folder, ownerId, contentType, data }) {
    const file = await StoredFile.create({
      folder,
      contentType,
      data,
      businessId: ownerId && mongoose.Types.ObjectId.isValid(ownerId) ? ownerId : undefined
    });
    return { url: `${URL_PREFIX}${file._id}` };
  },

  async deleteByUrl(url) {
    if (!url.startsWith(URL_PREFIX)) return false;
    const id = url.slice(URL_PREFIX.length);
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    await StoredFile.deleteOne({ _id: id });
    return true;
  }
};

/** For the public image route — the bytes behind a URL this driver handed out. */
export const readMongoFile = (id: string): Promise<IStoredFile | null> =>
  mongoose.Types.ObjectId.isValid(id) ? StoredFile.findById(id) : Promise.resolve(null);
