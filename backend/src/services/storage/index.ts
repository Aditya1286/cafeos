// The one entry point for file uploads. Callers hand over a base64 data URL (what the browser
// produces) and get back a public URL; which store holds the bytes is decided here, by
// storage.driver. To move to another store, add a driver — no caller changes.
import { storage } from '../../config';
import { logger } from '../../utils/logger';
import { ServiceError } from '../../utils/serviceError';
import { mongoDriver } from './mongo.driver';
import { s3Driver } from './s3.driver';
import { StorageDriver, StorageFolder } from './storage.types';

export type { StorageFolder } from './storage.types';
export { readMongoFile } from './mongo.driver';

const drivers: Record<StorageDriver['name'], StorageDriver> = { mongo: mongoDriver, s3: s3Driver };

export const getStorage = (): StorageDriver => drivers[storage.driver];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Raster formats only — an SVG could carry script, and it's served from our own origin.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const parseImageDataUrl = (dataUrl: unknown): { contentType: string; data: Buffer } => {
  if (typeof dataUrl !== 'string' || !dataUrl) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'An image is required.');
  }
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match || !ALLOWED_IMAGE_TYPES.includes(match[1])) {
    throw new ServiceError(400, 'INVALID_IMAGE', 'Image must be a JPEG, PNG, or WEBP file.');
  }
  const data = Buffer.from(match[2], 'base64');
  if (data.length > MAX_IMAGE_BYTES) {
    throw new ServiceError(400, 'IMAGE_TOO_LARGE', 'Image must be under 5MB.');
  }
  return { contentType: match[1], data };
};

export const MAX_AUDIO_BYTES = 1024 * 1024;
// Plain audio containers only; browsers report .mp3 as audio/mpeg and .m4a as audio/mp4 or audio/x-m4a.
const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  'audio/mpeg': 'audio/mpeg',
  'audio/mp3': 'audio/mpeg',
  'audio/wav': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/wave': 'audio/wav',
  'audio/ogg': 'audio/ogg',
  'audio/webm': 'audio/webm',
  'audio/mp4': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'audio/aac': 'audio/aac'
};

export const parseAudioDataUrl = (dataUrl: unknown): { contentType: string; data: Buffer } => {
  if (typeof dataUrl !== 'string' || !dataUrl) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'A sound file is required.');
  }
  const match = dataUrl.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const contentType = match && ALLOWED_AUDIO_TYPES[match[1]];
  if (!match || !contentType) {
    throw new ServiceError(400, 'INVALID_AUDIO', 'Sound must be an MP3, WAV, OGG, M4A or AAC file.');
  }
  const data = Buffer.from(match[2], 'base64');
  if (!data.length || data.length > MAX_AUDIO_BYTES) {
    throw new ServiceError(400, 'AUDIO_TOO_LARGE', 'Sound must be under 1MB. A few seconds is plenty.');
  }
  return { contentType, data };
};

/** Validates an uploaded alert sound (MP3/WAV/OGG/M4A/AAC, ≤ 1MB) and stores it with the configured driver. */
export const uploadAudio = async (params: { dataUrl: unknown; folder: StorageFolder; ownerId?: string }) => {
  const { contentType, data } = parseAudioDataUrl(params.dataUrl);
  return getStorage().put({ folder: params.folder, ownerId: params.ownerId, contentType, data });
};

/** Validates an uploaded image (JPEG/PNG/WEBP, ≤ 5MB) and stores it with the configured driver. */
export const uploadImage = async (params: { dataUrl: unknown; folder: StorageFolder; ownerId?: string }) => {
  const { contentType, data } = parseImageDataUrl(params.dataUrl);
  return getStorage().put({ folder: params.folder, ownerId: params.ownerId, contentType, data });
};

/**
 * Best-effort removal of a file we stored earlier, whichever driver wrote it (so files from
 * before a driver switch still get cleaned up). Never throws — a leftover file is harmless,
 * a failed profile update because of one is not.
 */
export const deleteFile = async (url: string | null | undefined): Promise<void> => {
  if (!url) return;
  for (const driver of Object.values(drivers)) {
    try {
      if (await driver.deleteByUrl(url)) return;
    } catch (error: any) {
      logger.warn({ url, driver: driver.name, err: error?.message }, '[storage] could not delete file');
      return;
    }
  }
};
