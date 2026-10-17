// Café identity, Task 8: guest passes are issued only with proof (a fresh-OTP device proof, or a
// pass this café issued for the same phone), and only a proven order writes guest memory.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { cafeIdentity } from '../src/config';
import { Business } from '../src/models/Business';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { GuestProfile } from '../src/models/GuestProfile';
import { signDeviceProof, signGuestPass, verifyGuestPass } from '../src/utils/guestToken';
import { firstNameOf } from '../src/services/guestMemory.service';
import { startHarness, Harness, businessIdFor, firstProductIdFor } from './helpers';

let h: Harness;
let artisanId: string;
let otherCafeId: string;
let productId: string;
let seq = 0;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  otherCafeId = (await Business.findOne({ _id: { $ne: artisanId } }))!._id.toString();
  productId = await firstProductIdFor('artisan-cafe');
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
});
after(async () => {
  await h.stop();
});

let phoneSeq = 0;
const freshPhone = () => `96${String(++phoneSeq).padStart(8, '0')}`;

/** Places an order at the artisan café for `phone`, with optional proofs. */
const order = async (phone: string, opts: { name?: string; deviceProof?: string; pass?: string } = {}) => {
  seq++;
  const qrToken = `tok_gm_${seq}`;
  await Table.create({ businessId: artisanId, tableNumber: `GM ${seq}`, capacity: 2, qrToken });
  await VerifiedPhone.updateOne(
    { mobile: `91${phone}`, purpose: 'ORDER' },
    { $set: { expiresAt: new Date(Date.now() + 86_400_000) } },
    { upsert: true }
  );
  const req = request(h.app).post('/api/v1/public/orders');
  if (opts.pass) req.set('X-Guest-Token', opts.pass);
  const res = await req.send({
    qrToken,
    customerName: opts.name ?? 'Asha Rao',
    customerPhone: phone,
    paymentMethod: 'CASH',
    items: [{ productId, quantity: 1 }],
    ...(opts.deviceProof ? { deviceProof: opts.deviceProof } : {})
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};

const profileOf = (phone: string, businessId = artisanId) => GuestProfile.findOne({ businessId, phone });

test('firstNameOf takes the first word, trimmed, at most 40 characters', () => {
  assert.equal(firstNameOf('  Asha   Rao '), 'Asha');
  assert.equal(firstNameOf('x'.repeat(60)).length, 40);
});

test('an order with a valid device proof gets a pass and a profile', async () => {
  const phone = freshPhone();
  const data = await order(phone, { deviceProof: signDeviceProof(phone) });
  assert.ok(data.guestToken, 'no guestToken');
  assert.ok(data.guestTokenExpiresAt);
  assert.deepEqual(verifyGuestPass(data.guestToken, artisanId), { phone });
  const profile = await profileOf(phone);
  assert.equal(profile!.firstName, 'Asha');
  assert.ok(profile!.expireAt.getTime() > Date.now() + 360 * 86_400_000);
});

test('an order with no proof gets no pass and never rewrites memory', async () => {
  const fresh = freshPhone();
  const none = await order(fresh);
  assert.equal(none.guestToken, undefined);
  assert.equal(await profileOf(fresh), null);

  const phone = freshPhone();
  await order(phone, { deviceProof: signDeviceProof(phone) });
  const before = await profileOf(phone);
  const impostor = await order(phone, { name: 'Mallory' });
  assert.equal(impostor.guestToken, undefined);
  const after = await profileOf(phone);
  assert.equal(after!.firstName, 'Asha');
  assert.equal(after!.lastVisitAt.getTime(), before!.lastVisitAt.getTime());
});

test('an order with a valid pass renews it', async () => {
  const phone = freshPhone();
  const old = signGuestPass({ phone, businessId: artisanId }, 3600);
  const data = await order(phone, { pass: old.token });
  assert.ok(data.guestToken);
  assert.ok(new Date(data.guestTokenExpiresAt).getTime() > old.expiresAt.getTime());
  assert.ok(await profileOf(phone));
});

test('a pass for another café gets no pass and no write', async () => {
  const phone = freshPhone();
  const foreign = signGuestPass({ phone, businessId: otherCafeId });
  const data = await order(phone, { pass: foreign.token });
  assert.equal(data.guestToken, undefined);
  assert.equal(await profileOf(phone), null);
});

test('a pass for a different phone (shared phone) gets no pass and no write', async () => {
  const phone = freshPhone();
  const someoneElse = freshPhone();
  const pass = signGuestPass({ phone: someoneElse, businessId: artisanId });
  const data = await order(phone, { pass: pass.token });
  assert.equal(data.guestToken, undefined);
  assert.equal(await profileOf(phone), null);
  assert.equal(await profileOf(someoneElse), null);
});

test('a device proof for a different phone gets no pass', async () => {
  const phone = freshPhone();
  const data = await order(phone, { deviceProof: signDeviceProof(freshPhone()) });
  assert.equal(data.guestToken, undefined);
  assert.equal(await profileOf(phone), null);
});

test('café switch off: no pass', async () => {
  await Business.updateOne({ _id: artisanId }, { 'identity.enabled': false });
  try {
    const phone = freshPhone();
    const data = await order(phone, { deviceProof: signDeviceProof(phone) });
    assert.equal(data.guestToken, undefined);
    assert.equal(await profileOf(phone), null);
  } finally {
    await Business.updateOne({ _id: artisanId }, { 'identity.enabled': true });
  }
});

test('platform switch off: no pass', async () => {
  const original = cafeIdentity.enabled;
  cafeIdentity.enabled = false;
  try {
    const phone = freshPhone();
    const data = await order(phone, { deviceProof: signDeviceProof(phone) });
    assert.equal(data.guestToken, undefined);
  } finally {
    cafeIdentity.enabled = original;
  }
});

test('/otp/verify returns a device proof for a fresh OTP, none when already verified', async () => {
  const phone = freshPhone();
  const sent = await request(h.app).post('/api/v1/public/otp/request').send({ phone });
  assert.equal(sent.body.code, 'OTP_SENT');
  const verified = await request(h.app).post('/api/v1/public/otp/verify').send({ phone, otp: sent.body.debugOtp });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  assert.ok(verified.body.deviceProof, 'no deviceProof');

  // Now order-verified: the request short-circuits, no code exists, and verify yields no proof.
  const again = await request(h.app).post('/api/v1/public/otp/request').send({ phone });
  assert.equal(again.body.code, 'ALREADY_VERIFIED');
  const second = await request(h.app).post('/api/v1/public/otp/verify').send({ phone, otp: '0000' });
  assert.equal(second.body.deviceProof, undefined);

  // A RECOVERY OTP never yields one either.
  const rec = await request(h.app).post('/api/v1/public/otp/request').send({ phone, purpose: 'RECOVERY' });
  const recVerified = await request(h.app).post('/api/v1/public/otp/verify').send({ phone, otp: rec.body.debugOtp, purpose: 'RECOVERY' });
  assert.equal(recVerified.body.success, true);
  assert.equal(recVerified.body.deviceProof, undefined);
});
