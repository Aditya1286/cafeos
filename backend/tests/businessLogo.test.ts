// A business's own logo: only its owner can set it, it goes through the storage helper like any
// image, replacing it removes the old file, and it comes back in the signed-in details the
// dashboard's top bar reads.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, Harness } from './helpers';
import authRoutes from '../src/routes/authRoutes';
import businessRoutes from '../src/routes/businessRoutes';
import staffRoutes from '../src/routes/staffRoutes';
import { Business } from '../src/models/Business';

let h: Harness;
let owner: string;
let staffToken: string;

// 1×1 transparent PNG.
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const as = (token: string) => ({ Authorization: `Bearer ${token}` });
const putLogo = (token: string, image: unknown) => request(h.app).put('/api/v1/business/logo').set(as(token)).send({ image });

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/business', businessRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  owner = await tokenFor('owner@artisan.com');
  await request(h.app).post('/api/v1/staff').set(as(owner)).send({ name: 'Line Cook', email: 'linecook@artisan.com', password: 'kitchen-pass-1' });
  staffToken = (await request(h.app).post('/api/v1/auth/login').send({ email: 'linecook@artisan.com', password: 'kitchen-pass-1' })).body.data.token;
});
after(async () => {
  await h.stop();
});

test('the owner sets the logo, and it is served back as an image', async () => {
  const res = await putLogo(owner, PNG_DATA_URL);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const url: string = res.body.data.logoUrl;
  assert.match(url, /^\/api\/v1\/public\/images\//);

  const file = await request(h.app).get(url);
  assert.equal(file.status, 200);
  assert.equal(file.headers['content-type'], 'image/png');
  assert.equal((await Business.findOne({ slug: 'artisan-cafe' }))!.logoUrl, url);
});

test('the signed-in details carry the logo, for the top bar', async () => {
  const me = await request(h.app).get('/api/v1/auth/me').set(as(owner));
  assert.equal(me.status, 200);
  assert.match(me.body.data.business.logoUrl, /^\/api\/v1\/public\/images\//);
  // Staff see the same top bar, so they get the logo too.
  const staffMe = await request(h.app).get('/api/v1/auth/me').set(as(staffToken));
  assert.equal(staffMe.body.data.business.logoUrl, me.body.data.business.logoUrl);
});

test('a new logo replaces the old one, whose file is removed', async () => {
  const first = (await request(h.app).get('/api/v1/auth/me').set(as(owner))).body.data.business.logoUrl;
  const second = await putLogo(owner, PNG_DATA_URL);
  assert.equal(second.status, 200);
  assert.notEqual(second.body.data.logoUrl, first);
  assert.equal((await request(h.app).get(first)).status, 404, 'the old file is deleted');
});

test('removing the logo goes back to the default tile', async () => {
  const current = (await request(h.app).get('/api/v1/auth/me').set(as(owner))).body.data.business.logoUrl;
  const res = await request(h.app).delete('/api/v1/business/logo').set(as(owner));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.logoUrl, '');
  assert.equal((await request(h.app).get(current)).status, 404);
  assert.equal((await request(h.app).get('/api/v1/auth/me').set(as(owner))).body.data.business.logoUrl, '');
});

test('only the owner can change it, not staff and not a signed-out visitor', async () => {
  assert.equal((await putLogo(staffToken, PNG_DATA_URL)).status, 403);
  assert.equal((await request(h.app).delete('/api/v1/business/logo').set(as(staffToken))).status, 403);
  assert.equal((await request(h.app).put('/api/v1/business/logo').send({ image: PNG_DATA_URL })).status, 401);
});

test('only real images are accepted', async () => {
  const svg = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64')}`;
  const bad = await putLogo(owner, svg);
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'INVALID_IMAGE');
  assert.equal((await putLogo(owner, 'not an image')).status, 400);
  assert.equal((await putLogo(owner, undefined)).status, 400);
});

test("one business's owner changes only their own logo", async () => {
  const other = await tokenFor('owner@beanandbutter.com'); // a second seeded business
  const artisanBefore = (await Business.findOne({ slug: 'artisan-cafe' }))!.logoUrl;
  const res = await putLogo(other, PNG_DATA_URL);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await Business.findOne({ slug: 'bean-and-butter' }))!.logoUrl, res.body.data.logoUrl);
  assert.equal((await Business.findOne({ slug: 'artisan-cafe' }))!.logoUrl, artisanBefore, "the first business's logo is untouched");
});
