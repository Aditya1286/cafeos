import { StorageFolder } from '../../models/StoredFile';

export type { StorageFolder };

export interface PutFileInput {
  folder: StorageFolder;
  // Groups files per tenant/user in the store (S3 key prefix, Mongo businessId). Optional for
  // platform-level files.
  ownerId?: string;
  contentType: string;
  data: Buffer;
}

/**
 * One place files can live. Everything outside services/storage talks to files only through
 * public URLs, so swapping or adding a driver never touches callers.
 */
export interface StorageDriver {
  readonly name: 'mongo' | 's3';
  /** Stores the file and returns the URL it's publicly served from. */
  put(input: PutFileInput): Promise<{ url: string }>;
  /** Deletes a file this driver stored. Returns false (and does nothing) for someone else's URL. */
  deleteByUrl(url: string): Promise<boolean>;
}
