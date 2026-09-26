import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { ServiceError } from '../../utils/serviceError';
import { StorageDriver } from './storage.types';

// One central bucket for every business. Keys look like `<folder>/<ownerId>/<uuid>.<ext>`
// (e.g. `menu/650f…/3b2c….webp`), so one tenant's files are easy to find or purge.

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const requireBucket = () => {
  if (!config.s3.bucket) {
    throw new ServiceError(500, 'STORAGE_NOT_CONFIGURED', 'File storage is not configured (S3_BUCKET is empty).');
  }
  return config.s3.bucket;
};

const publicBaseUrl = () =>
  (config.s3.publicBaseUrl || `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com`).replace(/\/+$/, '');

// Rebuilt only when the S3 settings change (they're read from config at call time).
let cached: { signature: string; client: S3Client } | null = null;
const getClient = (): S3Client => {
  const { region, endpoint, accessKeyId, secretAccessKey } = config.s3;
  const signature = [region, endpoint, accessKeyId].join('|');
  if (!cached || cached.signature !== signature) {
    cached = {
      signature,
      client: new S3Client({
        region,
        // S3-compatible stores (R2, MinIO, …) use their own endpoint and path-style URLs, and many
        // reject the SDK's newer default checksum headers — only send those when required.
        ...(endpoint
          ? {
              endpoint,
              forcePathStyle: true,
              requestChecksumCalculation: 'WHEN_REQUIRED' as const,
              responseChecksumValidation: 'WHEN_REQUIRED' as const
            }
          : {}),
        // Without explicit keys the SDK falls back to its default chain (IAM role, etc.).
        ...(accessKeyId ? { credentials: { accessKeyId, secretAccessKey } } : {})
      })
    };
  }
  return cached.client;
};

export const s3Driver: StorageDriver = {
  name: 's3',

  async put({ folder, ownerId, contentType, data }) {
    const bucket = requireBucket();
    const key = `${folder}/${ownerId || 'platform'}/${uuidv4()}.${EXTENSIONS[contentType] || 'bin'}`;
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        // Keys are never reused (uuid), so the file behind a URL never changes.
        CacheControl: 'public, max-age=31536000, immutable'
      })
    );
    return { url: `${publicBaseUrl()}/${key}` };
  },

  async deleteByUrl(url) {
    if (!config.s3.bucket) return false;
    const base = `${publicBaseUrl()}/`;
    if (!url.startsWith(base)) return false;
    await getClient().send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: url.slice(base.length) }));
    return true;
  }
};
