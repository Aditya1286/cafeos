// Café identity, Task 9: the returning-guest welcome. Only a guest pass for THIS café opens it,
// and it never reveals the phone number.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { cafeIdentity } from '../src/config';
import { Business } from '../src/models/Business';
import { Product } from '../src/models/Product';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { GuestProfile } from '../src/models/GuestProfile';
import { signDeviceProof, signGuestPass } from '../src/utils/guestToken';
import { usualProductFor, pickWelcome } from '../src/services/welcome.service';
import { startHarness, Harness, businessIdFor } from './helpers';

let h: Harness;
let artisanId: string;
let otherCafeId: string;
let dish: { _id: string; name: string };
let seq = 0;
const PHONE = '9555012345';
let pass: string;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  otherCafeId = (await Business.findOne({ _id: { $ne: artisanId } }))!._id.toString();
  await Business.updateOne({ _id: { $in: [artisanId, otherCafeId] } }, { identity: { enabled: true } });
  const p = (await Product.findOne({ businessId: artisanId, isAvailable: true, isDeleted: false }))!;
  dish = { _id: p._id.toString(), name: p.name };

  // A proof-gated order: the device proof earns the pass, and the order makes the dish the usual.
  seq++;
  const qrToken = `tok_welcome_${seq}`;
  await Table.create({ businessId: artisanId, tableNumber: `W ${seq}`, capacity: 2, qrToken });
  await VerifiedPhone.create({ mobile: `91${PHONE}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  const res = await request(h.app)
    .post('/api/v1/public/orders')
    .send({
      qrToken,
      customerName: 'Asha Rao',
      customerPhone: `+91 ${PHONE.slice(0, 5)} ${PHONE.slice(5)}`,
      paymentMethod: 'CASH',
      items: [{ productId: dish._id, quantity: 1 }],
      deviceProof: signDeviceProof(PHONE)
    });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  pass = res.body.data.guestToken;
  assert.ok(pass);
});
after(async () => {
  await h.stop();
});

const welcome = (businessId: string, token?: string) => {
  const req = request(h.app).get(`/api/v1/public/c/${businessId}/welcome`);
  return token ? req.set('X-Guest-Token', token) : req;
};

test('usualProductFor finds the guest’s dish however the phone was typed', async () => {
  assert.deepEqual(await usualProductFor(artisanId, PHONE), { productId: dish._id, name: dish.name });
  assert.equal(await usualProductFor(artisanId, '9000000000'), null);
});

test('the welcome with the pass names the guest and the usual dish, never the phone', async () => {
  const res = await welcome(artisanId, pass);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.match(res.body.data.line, /Asha/);
  assert.ok(res.body.data.line.includes(dish.name), res.body.data.line);
  assert.equal(res.body.data.usualProductId, dish._id);
  assert.ok(!JSON.stringify(res.body).includes(PHONE), 'phone leaked');
});

test('two consecutive welcomes use different templates', async () => {
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const res = await welcome(artisanId, pass);
    assert.equal(res.status, 200);
    ids.push((await GuestProfile.findOne({ businessId: artisanId, phone: PHONE }))!.lastWelcomeTemplateId!);
  }
  assert.notEqual(ids[0], ids[1]);
});

test('without an available usual, the name-only fallbacks are used', async () => {
  await Product.updateOne({ _id: dish._id }, { isAvailable: false });
  try {
    const res = await welcome(artisanId, pass);
    assert.equal(res.status, 200);
    assert.ok(!res.body.data.line.includes(dish.name));
    assert.equal(res.body.data.usualProductId, undefined);
  } finally {
    await Product.updateOne({ _id: dish._id }, { isAvailable: true });
  }
});

test('a pass for another café is rejected', async () => {
  const foreign = signGuestPass({ phone: PHONE, businessId: otherCafeId }).token;
  assert.equal((await welcome(artisanId, foreign)).status, 204);
  // Nor does this café's pass open the other café.
  assert.equal((await welcome(otherCafeId, pass)).status, 204);
});

test('no header, a junk header or a junk café id → 204', async () => {
  assert.equal((await welcome(artisanId)).status, 204);
  assert.equal((await welcome(artisanId, 'not.a.token')).status, 204);
  assert.equal((await welcome('not-an-id', pass)).status, 204);
});

test('a valid pass with no profile → 204', async () => {
  const stranger = signGuestPass({ phone: '9111111111', businessId: artisanId }).token;
  assert.equal((await welcome(artisanId, stranger)).status, 204);
});

test('café switch off → 204; platform switch off → 204', async () => {
  await Business.updateOne({ _id: artisanId }, { 'identity.enabled': false });
  try {
    assert.equal((await welcome(artisanId, pass)).status, 204);
  } finally {
    await Business.updateOne({ _id: artisanId }, { 'identity.enabled': true });
  }
  const original = cafeIdentity.enabled;
  cafeIdentity.enabled = false;
  try {
    assert.equal((await welcome(artisanId, pass)).status, 204);
  } finally {
    cafeIdentity.enabled = original;
  }
});

test('pickWelcome prefers the guest’s own answer templates, then the fallbacks', () => {
  const profile: any = {
    firstName: 'Asha',
    answers: new Map([['chai-mood', { optionId: 'chai-mood-kadak', answeredAt: new Date() }]]),
    lastWelcomeTemplateId: undefined
  };
  assert.deepEqual(pickWelcome(profile, { name: 'Masala Chai' }), { id: 'chai-mood-kadak.1', line: 'Welcome back, Asha! Kadak Masala Chai again?' });
  profile.lastWelcomeTemplateId = 'chai-mood-kadak.1';
  assert.match(pickWelcome(profile, { name: 'Masala Chai' })!.id, /^welcome-usual-/);
  profile.lastWelcomeTemplateId = undefined;
  assert.equal(pickWelcome(profile, null)!.id, 'chai-mood-kadak.2');
});
