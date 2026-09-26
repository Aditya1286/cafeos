// Mongo operator injection: request fields go straight into Mongo filters, so an object like
// {"$ne": null} where a string belongs would turn a lookup into "match anything". The
// rejectMongoOperators middleware refuses such requests; the controllers also type-check the
// fields themselves, so neither layer alone is load-bearing.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, createOrderPlacer, Harness } from './helpers';
import { Order } from '../src/models/Order';

let h: Harness;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  placeOrder = await createOrderPlacer(h.app, 'inject');
});
after(async () => {
  await h.stop();
});

test("an operator as the idempotency key can't pull out another customer's order", async () => {
  const victim = await placeOrder();
  await Order.updateOne({ _id: victim._id }, { idempotencyKey: 'victim-key' });

  const res = await request(h.app).post('/api/v1/public/orders').send({ idempotencyKey: { $ne: null } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_INPUT');
  assert.equal(res.body.data, undefined);
});

test('operators nested deep in the body are refused too', async () => {
  const res = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken: 'x', items: [{ productId: { $gt: '' } }] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_INPUT');
});

test('operators smuggled in through the query string are refused', async () => {
  const res = await request(h.app).get('/api/v1/public/otp/status?phone[$ne]=x');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'INVALID_INPUT');
});

test("a known idempotency key with a different phone doesn't return that order", async () => {
  const victim = await placeOrder();
  await Order.updateOne({ _id: victim._id }, { idempotencyKey: 'victim-key-2' });

  const res = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ idempotencyKey: 'victim-key-2', customerPhone: '9123456789', customerName: 'x', businessSlug: 'artisan', items: [{}] });
  assert.notEqual(res.status, 200);
  assert.equal(res.body.data, undefined);
});

test('ordinary requests still go through', async () => {
  const order = await placeOrder();
  const res = await request(h.app).get(`/api/v1/public/orders/${order._id}`);
  assert.equal(res.status, 200);
});
