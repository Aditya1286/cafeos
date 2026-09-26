// The storage helper's S3 driver against a stub S3-compatible server: objects land in the one
// central bucket under <folder>/<ownerId>/…, are served from the public base URL, and can be
// deleted by that URL. (The Mongo driver is covered end-to-end by account.test.ts.)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import { config } from '../src/config';
import { uploadImage, deleteFile } from '../src/services/storage';

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
const PNG_DATA_URL = `data:image/png;base64,${PNG_BYTES.toString('base64')}`;

const received: { method: string; path: string; contentType?: string; body: Buffer }[] = [];
let server: http.Server;

before(async () => {
  const app = express();
  app.use(express.raw({ type: () => true, limit: '10mb' }));
  app.all(/.*/, (req, res) => {
    received.push({ method: req.method, path: req.path, contentType: req.headers['content-type'], body: req.body });
    res.status(req.method === 'DELETE' ? 204 : 200).set('ETag', '"stub"').end();
  });
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  config.storageDriver = 's3';
  config.s3.bucket = 'cafeos-media';
  config.s3.region = 'ap-south-1';
  config.s3.endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  config.s3.accessKeyId = 'test-key';
  config.s3.secretAccessKey = 'test-secret';
  config.s3.publicBaseUrl = 'https://cdn.example.test/';
});
after(async () => {
  config.storageDriver = 'mongo';
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('uploads go to the central bucket and come back as a public CDN URL', async () => {
  const { url } = await uploadImage({ dataUrl: PNG_DATA_URL, folder: 'menu', ownerId: 'biz123' });
  assert.match(url, /^https:\/\/cdn\.example\.test\/menu\/biz123\/[0-9a-f-]{36}\.png$/);

  const put = received.find((r) => r.method === 'PUT');
  assert.ok(put, 'no PUT reached S3');
  assert.equal(put!.path, `/cafeos-media/${url.replace('https://cdn.example.test/', '')}`);
  assert.equal(put!.contentType, 'image/png');
  assert.ok(put!.body.equals(PNG_BYTES), 'uploaded bytes differ');
});

test('deleting by URL removes exactly that object; foreign URLs are ignored', async () => {
  const { url } = await uploadImage({ dataUrl: PNG_DATA_URL, folder: 'avatars', ownerId: 'user9' });
  received.length = 0;

  await deleteFile(url);
  await deleteFile('https://somewhere-else.test/avatars/x.png');

  assert.deepEqual(
    received.map((r) => `${r.method} ${r.path}`),
    [`DELETE /cafeos-media/${url.replace('https://cdn.example.test/', '')}`]
  );
});

test('a missing bucket is a clear configuration error, not a crash', async () => {
  const bucket = config.s3.bucket;
  config.s3.bucket = '';
  try {
    await assert.rejects(uploadImage({ dataUrl: PNG_DATA_URL, folder: 'menu' }), { code: 'STORAGE_NOT_CONFIGURED' });
  } finally {
    config.s3.bucket = bucket;
  }
});
