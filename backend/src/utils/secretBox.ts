import crypto from 'crypto';
import { config } from '../config';

// AES-256-GCM for small secrets stored at rest (a café's SMEPay client secret). The configured
// key is hashed to exactly 32 bytes so any string works. Output: "v1:<iv>:<tag>:<ciphertext>",
// all base64 — the version prefix leaves room to rotate the scheme later.
const key = () => crypto.createHash('sha256').update(String(config.credentialsEncryptionKey)).digest();

export const encryptSecret = (plaintext: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
};

export const decryptSecret = (payload: string): string => {
  const [version, iv, tag, ciphertext] = payload.split(':');
  if (version !== 'v1' || !iv || !tag || !ciphertext) {
    throw new Error('Unrecognized encrypted secret format');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
};
