// Signing in with a phone number instead of an email (same password): owners by their business
// number, staff by the number their owner saved. A number must lead to one account — staff
// numbers are kept unique, and where two accounts do share one, the password tells them apart.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, businessIdFor, Harness } from './helpers';
import authRoutes from '../src/routes/authRoutes';
import staffRoutes from '../src/routes/staffRoutes';
import { User } from '../src/models/User';
import { hashPassword } from '../src/utils/password';
import { backfillUserPhoneKeys } from '../src/database/migrations/backfillUserPhoneKeys';

let h: Harness;
let owner: string;

const OWNER_EMAIL = 'owner@artisan.com';
const BUSINESS_PHONE = '9876501234'; // artisan-cafe's number in the seed
const PASSWORD = 'password123';

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  owner = await tokenFor(OWNER_EMAIL);
});
after(async () => {
  await h.stop();
});

const loginByPhone = (phone: string, password: string) => request(h.app).post('/api/v1/auth/login').send({ phone, password });

test('an owner signs in with their business number, in any common format', async () => {
  for (const phone of [BUSINESS_PHONE, '+91 98765 01234', '+919876501234']) {
    const res = await loginByPhone(phone, PASSWORD);
    assert.equal(res.status, 200, `${phone}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.data.user.email, OWNER_EMAIL);
  }
});

test('a wrong password or unknown number gets the same answer; email login is unchanged', async () => {
  for (const [phone, password] of [[BUSINESS_PHONE, 'wrong-password'], ['9000000001', PASSWORD], ['123', PASSWORD]]) {
    const res = await loginByPhone(phone, password);
    assert.equal(res.status, 401, `${phone}: ${res.status}`);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  }
  assert.equal((await request(h.app).post('/api/v1/auth/login').send({ email: OWNER_EMAIL, password: PASSWORD })).status, 200);
  assert.equal((await request(h.app).post('/api/v1/auth/login').send({ password: PASSWORD })).status, 400);
});

test('staff sign in with the number their owner saved, which must be unique', async () => {
  const taken = await request(h.app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${owner}`)
    .send({ name: 'Copycat', email: 'copycat@artisan.com', password: 'kitchen-pass-1', phone: `+91 ${BUSINESS_PHONE}` });
  assert.equal(taken.status, 400);
  assert.equal(taken.body.error.code, 'PHONE_IN_USE');

  const created = await request(h.app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${owner}`)
    .send({ name: 'Grill Cook', email: 'grill@artisan.com', password: 'kitchen-pass-1', phone: '9811100001' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal((await loginByPhone('9811100001', 'kitchen-pass-1')).body.data.user.role, 'STAFF');

  // Changing the number moves the login with it.
  const moved = await request(h.app)
    .put(`/api/v1/staff/${created.body.data.id}`)
    .set('Authorization', `Bearer ${owner}`)
    .send({ phone: '9811100002' });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal((await loginByPhone('9811100001', 'kitchen-pass-1')).status, 401);
  assert.equal((await loginByPhone('9811100002', 'kitchen-pass-1')).status, 200);

  // …and can't move onto someone else's.
  const clash = await request(h.app)
    .put(`/api/v1/staff/${created.body.data.id}`)
    .set('Authorization', `Bearer ${owner}`)
    .send({ phone: BUSINESS_PHONE });
  assert.equal(clash.body.error.code, 'PHONE_IN_USE');

  // Deactivated staff can't get in by number either.
  await request(h.app).put(`/api/v1/staff/${created.body.data.id}/status`).set('Authorization', `Bearer ${owner}`).send({ status: 'INACTIVE' });
  assert.equal((await loginByPhone('9811100002', 'kitchen-pass-1')).status, 403);
});

test('when two accounts share a number, the password picks the account; if both match, email is needed', async () => {
  const beanId = await businessIdFor('bean-and-butter');
  const shared = '9822200001';
  await User.create({ name: 'Twin A', email: 'twin-a@test.local', phone: shared, passwordHash: await hashPassword('password-a1'), role: 'OWNER', businessId: beanId });
  await User.create({ name: 'Twin B', email: 'twin-b@test.local', phone: `+91${shared}`, passwordHash: await hashPassword('password-b1'), role: 'OWNER', businessId: beanId });

  assert.equal((await loginByPhone(shared, 'password-a1')).body.data.user.email, 'twin-a@test.local');
  assert.equal((await loginByPhone(shared, 'password-b1')).body.data.user.email, 'twin-b@test.local');

  await User.create({ name: 'Twin C', email: 'twin-c@test.local', phone: shared, passwordHash: await hashPassword('password-a1'), role: 'OWNER', businessId: beanId });
  const ambiguous = await loginByPhone(shared, 'password-a1');
  assert.equal(ambiguous.status, 409);
  assert.equal(ambiguous.body.error.code, 'PHONE_AMBIGUOUS');
});

test('accounts from before phone login are backfilled on boot, owners from their business number', async () => {
  await User.updateOne({ email: OWNER_EMAIL }, { $unset: { phoneKey: 1, phone: 1 } });
  assert.equal((await loginByPhone(BUSINESS_PHONE, PASSWORD)).status, 401);

  await backfillUserPhoneKeys();
  assert.equal((await loginByPhone(BUSINESS_PHONE, PASSWORD)).status, 200);
  assert.equal(await backfillUserPhoneKeys(), 0, 'a second run should find nothing left to do');
});
