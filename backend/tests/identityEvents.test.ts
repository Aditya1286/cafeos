// Café identity measurement (spec §11): engagement events, the 30-day return rate and the super
// admin readout.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { cafeIdentity } from '../src/config';
import { Business } from '../src/models/Business';
import { Order } from '../src/models/Order';
import { IdentityEvent } from '../src/models/IdentityEvent';
import { recordEvent, returnRate30d, identitySummary, IDENTITY_EVENT_KINDS } from '../src/services/identityEvents.service';
import { startHarness, Harness, businessIdFor, superAdminToken, tokenFor } from './helpers';

let h: Harness;
let verdeId: string;
let artisanId: string;
const DAY = 24 * 60 * 60 * 1000;

before(async () => {
  h = await startHarness();
  verdeId = await businessIdFor('verde-bistro');
  artisanId = await businessIdFor('artisan-cafe');
});
after(async () => {
  await h.stop();
});
beforeEach(async () => {
  await IdentityEvent.deleteMany({});
  await Business.updateMany({}, { $unset: { identity: '' } });
});

let seq = 0;
/** Inserts a bare order at `createdAt` (raw insert, so the timestamp is kept as given). */
const seedOrder = (businessId: string, phone: string, createdAt: Date, orderStatus = 'COMPLETED') => {
  seq++;
  return Order.collection.insertOne({
    orderId: `RR-${seq}`,
    orderNumber: `RR-${seq}`,
    businessId: new mongoose.Types.ObjectId(businessId),
    tableName: 'Counter',
    customerName: 'Guest',
    customerPhone: phone,
    items: [],
    amendments: [],
    subtotalPaise: 1000,
    taxPaise: 0,
    platformFeePaise: 30,
    totalAmountPaise: 1000,
    businessEarningsPaise: 970,
    orderStatus,
    paymentStatus: 'PAID',
    paymentMethod: 'CASH',
    createdAt,
    updatedAt: createdAt
  });
};

const post = (body: unknown) => request(h.app).post('/api/v1/public/identity-events').send(body as object);

test('the event kinds are the spec list', () => {
  assert.deepEqual([...IDENTITY_EVENT_KINDS], [
    'welcome_shown', 'welcome_usual_added', 'tip_shown', 'pairing_shown', 'pairing_added',
    'pairing_ordered', 'question_shown', 'question_answered', 'not_you_clicked'
  ]);
});

test('an event with an unknown kind is a 400', async () => {
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
  for (const kind of ['nope', '', { $ne: null }, undefined, 'constructor']) {
    const res = await post({ businessId: artisanId, kind });
    assert.equal(res.status, 400, JSON.stringify(kind));
  }
  assert.equal((await post({ businessId: 'bad', kind: 'tip_shown' })).status, 400);
  assert.equal(await IdentityEvent.countDocuments(), 0);
});

test('a known event is stored for an enabled café, anonymously', async () => {
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
  const order = await Order.findOne({ businessId: artisanId });
  const res = await post({ businessId: artisanId, kind: 'tip_shown', orderId: order!._id.toString() });
  assert.equal(res.status, 202);
  // An orderId from another café is dropped, the event is still kept.
  const foreign = await Order.findOne({ businessId: { $ne: artisanId } });
  await post({ businessId: artisanId, kind: 'pairing_shown', orderId: foreign!._id.toString() });

  const events = await IdentityEvent.find({ businessId: artisanId }).sort({ at: 1 }).lean();
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, 'tip_shown');
  assert.equal(events[0].orderId!.toString(), order!._id.toString());
  assert.equal(events[1].orderId, undefined);

  // Identifying meta never lands in the collection.
  await recordEvent(artisanId, 'welcome_shown', { phone: '9876543210', customerName: 'Asha', slot: 'morning' });
  const welcome = await IdentityEvent.findOne({ kind: 'welcome_shown' }).lean();
  assert.deepEqual(welcome!.meta, { slot: 'morning' });
});

test('events are not stored when the gate is off', async () => {
  // Café off.
  assert.equal((await post({ businessId: artisanId, kind: 'tip_shown' })).status, 202);
  await recordEvent(artisanId, 'welcome_shown');
  assert.equal(await IdentityEvent.countDocuments(), 0);

  // Café on, platform off.
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
  const original = cafeIdentity.enabled;
  cafeIdentity.enabled = false;
  try {
    await post({ businessId: artisanId, kind: 'tip_shown' });
    await recordEvent(artisanId, 'welcome_shown');
  } finally {
    cafeIdentity.enabled = original;
  }
  assert.equal(await IdentityEvent.countDocuments(), 0);
});

test('returnRate30d: one guest back on day 10, one on day 40 → 1 of 2', async () => {
  await Order.deleteMany({ businessId: verdeId });
  const from = new Date('2025-01-01T00:00:00Z');
  const to = new Date('2025-03-01T00:00:00Z');
  const d = (n: number) => new Date(from.getTime() + n * DAY);
  await seedOrder(verdeId, '9811111111', d(1));
  await seedOrder(verdeId, '+91 98111 11111', d(11)); // same guest, typed differently: back on day 10
  await seedOrder(verdeId, '9822222222', d(2));
  await seedOrder(verdeId, '9822222222', d(42)); // back on day 40: too late
  await seedOrder(verdeId, '9833333333', d(5), 'CANCELLED'); // a cancelled order isn't a visit
  await seedOrder(verdeId, '9844444444', d(-5)); // outside the window
  assert.deepEqual(await returnRate30d(verdeId, from, to), { guests: 2, returned: 1, rate: 0.5 });
  // The next order may fall after the window.
  const r = await returnRate30d(verdeId, from, d(3));
  assert.deepEqual(r, { guests: 2, returned: 1, rate: 0.5 });
  assert.deepEqual(await returnRate30d(verdeId, new Date('2020-01-01'), new Date('2020-02-01')), { guests: 0, returned: 0, rate: 0 });
});

test('the summary lists enabled cafés with before/after rates and 30-day event counts', async () => {
  await Order.deleteMany({ businessId: verdeId });
  const enabledAt = new Date(Date.now() - 50 * DAY);
  const appliedAt = new Date(Date.now() - 45 * DAY);
  await Business.updateOne({ _id: verdeId }, { identity: { enabled: true, enabledAt, appliedAt, themeId: 'cozy-night', variantId: 'amber' } });
  const at = (offsetDays: number) => new Date(enabledAt.getTime() + offsetDays * DAY);
  // Before (the 60 days before enabledAt): two guests, neither returns within 30 days → 0.
  await seedOrder(verdeId, '9711111111', at(-55));
  await seedOrder(verdeId, '9722222222', at(-50));
  // Outside the before window entirely.
  await seedOrder(verdeId, '9799999999', at(-70));
  // After: two guests, both return → 1.
  await seedOrder(verdeId, '9733333333', at(2));
  await seedOrder(verdeId, '9733333333', at(9));
  await seedOrder(verdeId, '9744444444', at(5));
  await seedOrder(verdeId, '9744444444', at(20));

  await recordEvent(verdeId, 'tip_shown');
  await recordEvent(verdeId, 'tip_shown');
  await recordEvent(verdeId, 'pairing_added');
  await IdentityEvent.create({ businessId: verdeId, kind: 'tip_shown', at: new Date(Date.now() - 31 * DAY) }); // too old

  const rows = await identitySummary();
  assert.equal(rows.length, 1); // only enabled cafés
  const row = rows[0];
  assert.equal(row.businessId, verdeId);
  assert.equal(row.returnRateBefore, 0);
  assert.equal(row.returnRateAfter, 1);
  assert.equal(new Date(row.enabledAt!).getTime(), enabledAt.getTime());
  assert.equal(new Date(row.appliedAt!).getTime(), appliedAt.getTime());
  assert.deepEqual(row.events30d, { tip_shown: 2, pairing_added: 1 });

  // A café switched on with no history reads "unknown", not 0%.
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
  const both = await identitySummary();
  const artisan = both.find((r) => r.businessId === artisanId)!;
  assert.equal(artisan.returnRateBefore, null);
  assert.equal(artisan.returnRateAfter, null);

  // Over HTTP: super admin only.
  const res = await request(h.app).get('/api/v1/admin/cafe-identity/summary').set('Authorization', `Bearer ${await superAdminToken()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.length, 2);
  const owner = await request(h.app).get('/api/v1/admin/cafe-identity/summary').set('Authorization', `Bearer ${await tokenFor('owner@artisan.com')}`);
  assert.equal(owner.status, 403);
});
