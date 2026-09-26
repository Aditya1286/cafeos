// OTP verification records: persisted in Mongo (survive restarts), 14-day sliding window for
// ordering, single-use 15-minute window for registration.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, businessIdFor, firstProductIdFor, Harness } from './helpers';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { Table } from '../src/models/Table';
import { verifyWidgetAccessToken } from '../src/services/otp.service';

const DAY_MS = 24 * 60 * 60 * 1000;
let h: Harness;
let artisanId: string;
let productId: string;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  productId = await firstProductIdFor('artisan-cafe');
});
after(async () => {
  await h.stop();
});
beforeEach(async () => {
  await VerifiedPhone.deleteMany({});
});

// Runs the mock-mode request -> verify round trip, exactly as the customer menu page does.
const verifyPhone = async (phone: string) => {
  const sent = await request(h.app).post('/api/v1/public/otp/request').send({ phone });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.code, 'OTP_SENT');
  const verified = await request(h.app).post('/api/v1/public/otp/verify').send({ phone, otp: sent.body.debugOtp });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.equal(verified.body.code, 'OTP_VERIFIED');
};

const status = async (phone: string) =>
  (await request(h.app).get('/api/v1/public/otp/status').query({ phone })).body.verified as boolean;

// A table takes one active order at a time, so every order here gets its own.
let tableSeq = 0;
const placeOrder = async (phone: string) => {
  const qrToken = `tok_otp_${++tableSeq}`;
  await Table.create({ businessId: artisanId, tableNumber: `OTP ${tableSeq}`, capacity: 2, qrToken });
  return request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken, customerName: 'Test Customer', customerPhone: phone, items: [{ productId, quantity: 1 }], paymentMethod: 'CASH' });
};

test('verifying persists ORDER (14 days) and REGISTRATION (15 min) records in Mongo', async () => {
  const start = Date.now();
  await verifyPhone('9876500001');

  const order = await VerifiedPhone.findOne({ mobile: '919876500001', purpose: 'ORDER' });
  const reg = await VerifiedPhone.findOne({ mobile: '919876500001', purpose: 'REGISTRATION' });
  assert.ok(order && reg);

  const orderTtl = order.expiresAt.getTime() - start;
  assert.ok(orderTtl > 14 * DAY_MS - 60_000 && orderTtl <= 14 * DAY_MS + 60_000, `order TTL was ${orderTtl / DAY_MS} days`);
  const regTtl = reg.expiresAt.getTime() - start;
  assert.ok(regTtl > 14 * 60_000 && regTtl <= 15 * 60_000 + 5_000, `registration TTL was ${regTtl / 60_000} min`);
});

test('verification survives a backend restart (fresh otp.service module, same DB)', async () => {
  await verifyPhone('9876500002');

  // Throw away the loaded service/dao modules — the old in-memory Map would be gone now.
  for (const mod of ['../src/services/otp.service', '../src/dao/verifiedPhone.dao']) {
    delete require.cache[require.resolve(mod)];
  }
  const fresh = require('../src/services/otp.service') as typeof import('../src/services/otp.service');
  assert.equal(await fresh.isPhoneOrderVerified('9876500002'), true);
  assert.equal(await fresh.isPhoneVerified('9876500002'), true);
});

test('every phone format maps to the same record', async () => {
  await verifyPhone('+91 98765-00003');
  assert.equal(await status('9876500003'), true);
  assert.equal(await status('919876500003'), true);
  assert.equal(await status('+919876500003'), true);
  assert.equal(await VerifiedPhone.countDocuments({ mobile: '919876500003' }), 2); // ORDER + REGISTRATION, no dupes

  // Re-verifying upserts rather than duplicating.
  await VerifiedPhone.deleteOne({ mobile: '919876500003', purpose: 'ORDER' });
  await verifyPhone('9876500003');
  assert.equal(await VerifiedPhone.countDocuments({ mobile: '919876500003' }), 2);
});

test('unverified, invalid, and empty phones are not verified', async () => {
  assert.equal(await status('9876500004'), false);
  assert.equal(await status('12345'), false);
  assert.equal(await status(''), false);
});

test('an expired ORDER record is not honoured even before the TTL monitor deletes it', async () => {
  await VerifiedPhone.create({ mobile: '919876500005', purpose: 'ORDER', expiresAt: new Date(Date.now() - 1000) });
  assert.equal(await status('9876500005'), false);
  const res = await placeOrder('9876500005');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'PHONE_NOT_VERIFIED');
});

test('a record 13 days in is still valid', async () => {
  await VerifiedPhone.create({ mobile: '919876500006', purpose: 'ORDER', expiresAt: new Date(Date.now() + 1 * DAY_MS) });
  assert.equal(await status('9876500006'), true);
});

test('order placement is gated on verification', async () => {
  const rejected = await placeOrder('9876500007');
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.error.code, 'PHONE_NOT_VERIFIED');

  await verifyPhone('9876500007');
  const placed = await placeOrder('9876500007');
  assert.equal(placed.status, 201, JSON.stringify(placed.body));
});

test('placing an order slides the window forward to a full 14 days', async () => {
  // Verified ~13 days ago: one day left.
  await VerifiedPhone.create({ mobile: '919876500008', purpose: 'ORDER', expiresAt: new Date(Date.now() + DAY_MS) });

  const placed = await placeOrder('9876500008');
  assert.equal(placed.status, 201, JSON.stringify(placed.body));

  const rec = await VerifiedPhone.findOne({ mobile: '919876500008', purpose: 'ORDER' });
  const remaining = rec!.expiresAt.getTime() - Date.now();
  assert.ok(remaining > 14 * DAY_MS - 60_000, `window only ${remaining / DAY_MS} days after ordering`);
});

test('an already-verified phone is not sent another (billed) OTP', async () => {
  await verifyPhone('9876500009');
  const res = await request(h.app).post('/api/v1/public/otp/request').send({ phone: '9876500009' });
  assert.equal(res.body.code, 'ALREADY_VERIFIED');
  assert.equal(res.body.debugOtp, undefined);
});

test('registration verification is single-use and does not touch the order window', async () => {
  const otp = require('../src/services/otp.service') as typeof import('../src/services/otp.service');
  await verifyPhone('9876500010');
  await otp.clearVerifiedPhone('9876500010');
  assert.equal(await otp.isPhoneVerified('9876500010'), false);
  assert.equal(await otp.isPhoneOrderVerified('9876500010'), true);
});

test('a wrong mock code does not verify', async () => {
  await request(h.app).post('/api/v1/public/otp/request').send({ phone: '9876500011' });
  const wrong = await request(h.app).post('/api/v1/public/otp/verify').send({ phone: '9876500011', otp: '0000' });
  assert.equal(wrong.body.code, 'OTP_MISMATCH');
  assert.equal(await status('9876500011'), false);
});

test('Mongo has the TTL index that garbage-collects expired records', async () => {
  const indexes = await VerifiedPhone.collection.indexes();
  const ttl = indexes.find((i) => i.key.expiresAt === 1);
  assert.equal(ttl?.expireAfterSeconds, 0);
  const unique = indexes.find((i) => i.key.mobile === 1 && i.key.purpose === 1);
  assert.equal(unique?.unique, true);
});

// ── Account verifications (password reset, email change) ────────────────────

test('an account OTP is always sent fresh, even for an order-verified phone', async () => {
  await verifyPhone('9812340004');
  const status = await request(h.app).get('/api/v1/public/otp/status').query({ phone: '9812340004', purpose: 'ACCOUNT' });
  assert.equal(status.body.verified, false);
  const sent = await request(h.app).post('/api/v1/public/otp/request').send({ phone: '9812340004', purpose: 'ACCOUNT' });
  assert.equal(sent.body.code, 'OTP_SENT');
});

// Live mode: the MSG91 widget runs in the browser, so for an account action the backend must be
// able to tie the token to the business number itself — a genuine token for some other phone
// must not count. MSG91's verifyAccessToken endpoint is stubbed here.
test('a live widget token only proves an account verification for the number it mentions', async () => {
  const realFetch = globalThis.fetch;
  const msg91Says = (body: unknown) => {
    globalThis.fetch = (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;
  };
  try {
    msg91Says({ type: 'success', message: '919999900000' });
    const foreign = await verifyWidgetAccessToken('9812340005', 'opaque-token', 'ACCOUNT');
    assert.equal(foreign.success, false);
    assert.equal(foreign.code, 'PHONE_MISMATCH');
    assert.equal(await VerifiedPhone.countDocuments({ purpose: 'ACCOUNT' }), 0);

    msg91Says({ type: 'success', message: '919812340005' });
    const own = await verifyWidgetAccessToken('9812340005', 'opaque-token', 'ACCOUNT');
    assert.equal(own.success, true);
    assert.equal(await VerifiedPhone.countDocuments({ mobile: '919812340005', purpose: 'ACCOUNT' }), 1);

    // The ordinary (non-account) flow keeps working as before when MSG91 doesn't echo the number.
    msg91Says({ type: 'success', message: 'verified' });
    assert.equal((await verifyWidgetAccessToken('9812340006', 'opaque-token')).success, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});
