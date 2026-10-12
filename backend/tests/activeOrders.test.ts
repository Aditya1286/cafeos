// GET /orders/active: every order the kitchen is still working on, oldest first. The kitchen board
// used to read the newest 25 orders of ANY status, so on a busy day older New/Preparing orders
// silently dropped off the screen. This endpoint is what makes "50 or 100 live orders" safe.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, createOrderPlacer, businessIdFor, Harness } from './helpers';
import mongoose from 'mongoose';
import { Order } from '../src/models/Order';
import staffRoutes from '../src/routes/staffRoutes';
import authRoutes from '../src/routes/authRoutes';
import { ACTIVE_ORDER_WINDOW_HOURS } from '../src/utils/orderStatus';

let h: Harness;
let owner: string;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  owner = await tokenFor('owner@artisan.com');
  placeOrder = await createOrderPlacer(h.app, 'active');
});
after(async () => {
  await h.stop();
});

const active = (token: string, query = '') =>
  request(h.app).get(`/api/v1/orders/active${query}`).set('Authorization', `Bearer ${token}`);

const setStatus = async (id: string, status: string) => {
  const res = await request(h.app).put(`/api/v1/orders/${id}/status`).set('Authorization', `Bearer ${owner}`).send({ status });
  assert.equal(res.status, 200, JSON.stringify(res.body));
};

/** Back-dates an order without touching the schema's own timestamp handling. */
const backdate = (id: string, ms: number) =>
  Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt: new Date(Date.now() - ms) } });

test('needs a login', async () => {
  const res = await request(h.app).get('/api/v1/orders/active');
  assert.equal(res.status, 401);
});

test('returns every live order (well past the old 25-order cap), oldest first, and nothing finished', async () => {
  // The demo seed already has live orders; count against them, not against zero.
  const baseline: string[] = (await active(owner)).body.data.map((o: any) => o._id);
  const live: string[] = [];
  for (let i = 0; i < 30; i++) live.push((await placeOrder())._id);

  // Spread them over the last hour so "oldest first" is a real ordering, then move a few along.
  for (let i = 0; i < live.length; i++) await backdate(live[i], (live.length - i) * 60_000);
  await setStatus(live[0], 'PREPARING');
  await setStatus(live[1], 'PREPARING');
  await setStatus(live[1], 'READY');
  await setStatus(live[2], 'CANCELLED');
  await setStatus(live[3], 'PREPARING');
  await setStatus(live[3], 'READY');
  await setStatus(live[3], 'COMPLETED');

  const res = await active(owner);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.success, true);
  assert.equal(res.body.truncated, false);

  const ids: string[] = res.body.data.map((o: any) => o._id);
  // 30 placed − 1 cancelled − 1 completed = 28 of ours still live, on top of the seed's: far more
  // than the old cap of 25.
  const ours = ids.filter((id) => live.includes(id));
  assert.equal(ours.length, 28);
  assert.ok(ids.length >= 28 + baseline.length);
  assert.ok(!ids.includes(live[2]) && !ids.includes(live[3]));
  assert.deepEqual(ours, live.filter((id) => id !== live[2] && id !== live[3]), 'oldest first');

  const times = res.body.data.map((o: any) => new Date(o.createdAt).getTime());
  assert.deepEqual([...times].sort((a, b) => a - b), times);
  assert.deepEqual(
    new Set(res.body.data.map((o: any) => o.orderStatus)),
    new Set(['PLACED', 'PREPARING', 'READY'])
  );
});

test('carries what a ticket needs, including createdAt', async () => {
  const res = await active(owner);
  const order = res.body.data[0];
  for (const field of ['_id', 'orderId', 'orderStatus', 'paymentStatus', 'tableName', 'customerName', 'items', 'totalAmountPaise', 'createdAt']) {
    assert.ok(field in order, `missing ${field}`);
  }
});

test('an old order stored as CONFIRMED still shows, as Preparing', async () => {
  const legacy = await placeOrder();
  await Order.collection.updateOne({ _id: new (require('mongoose').Types.ObjectId)(legacy._id) }, { $set: { orderStatus: 'CONFIRMED' } });
  const res = await active(owner);
  const shown = res.body.data.find((o: any) => o._id === legacy._id);
  assert.ok(shown, 'the legacy order is listed');
  assert.equal(shown.orderStatus, 'PREPARING', 'and the kitchen board would file it under Preparing');
  // Tidy up so later counts stay exact (a CONFIRMED order can't be cancelled: it reads as Preparing).
  await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(legacy._id) }, { $set: { orderStatus: 'COMPLETED' } });
});

test('an order left open for longer than the window is stale and stays out (it is still in All Orders)', async () => {
  const stale = await placeOrder();
  await backdate(stale._id, (ACTIVE_ORDER_WINDOW_HOURS + 2) * 3_600_000);
  const res = await active(owner);
  assert.ok(!res.body.data.some((o: any) => o._id === stale._id));
  const all = await request(h.app).get(`/api/v1/orders?q=${stale.orderId}`).set('Authorization', `Bearer ${owner}`);
  assert.ok(all.body.data.some((o: any) => o._id === stale._id));
  await setStatus(stale._id, 'CANCELLED');
});

test('a limit returns the oldest orders and says it cut the list', async () => {
  const full = await active(owner);
  const res = await active(owner, '?limit=5');
  assert.equal(res.body.data.length, 5);
  assert.equal(res.body.truncated, true);
  assert.deepEqual(
    res.body.data.map((o: any) => o._id),
    full.body.data.slice(0, 5).map((o: any) => o._id)
  );
  // A limit above the hard cap, or nonsense, doesn't break it.
  assert.equal((await active(owner, '?limit=999999')).status, 200);
  assert.equal((await active(owner, '?limit=-3')).status, 200);
  assert.equal((await active(owner, '?limit=abc')).status, 200);
});

test('is scoped to the caller’s own café', async () => {
  const other = await tokenFor('owner@beanandbutter.com');
  const res = await active(other);
  assert.equal(res.status, 200);
  const artisanId = await businessIdFor('artisan-cafe');
  assert.ok(res.body.data.every((o: any) => String(o.businessId) !== artisanId));
  assert.equal(res.body.data.length, 0);
});

test('kitchen staff can read it (they run the board)', async () => {
  const created = await request(h.app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${owner}`)
    .send({ name: 'Kitchen Kim', email: 'kim@artisan.com', password: 'kitchen-pass-1' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const login = await request(h.app).post('/api/v1/auth/login').send({ email: 'kim@artisan.com', password: 'kitchen-pass-1' });
  assert.equal(login.status, 200, JSON.stringify(login.body));

  const res = await active(login.body.data.token);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.data.length > 25, 'a staff login sees the same full live list');
});
