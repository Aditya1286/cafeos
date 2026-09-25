// Order lookup access control: public customer endpoints only accept the unguessable Mongo
// _id; staff endpoints accept either id but only within their own business.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, superAdminToken, businessIdFor, createOrderPlacer, Harness } from './helpers';
import { Order } from '../src/models/Order';

let h: Harness;
let artisanOwner: string;
let beanOwner: string;
let superAdmin: string;
let beanId: string;
let placeArtisanOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  beanId = await businessIdFor('bean-and-butter');
  artisanOwner = await tokenFor('owner@artisan.com');
  beanOwner = await tokenFor('owner@beanandbutter.com');
  superAdmin = await superAdminToken();
  placeArtisanOrder = await createOrderPlacer(h.app, 'access');
});
after(async () => {
  await h.stop();
});

// --- Public (customer) endpoints ----------------------------------------------------------

test('the tracking page can load its order by _id', async () => {
  const order = await placeArtisanOrder();
  const res = await request(h.app).get(`/api/v1/public/orders/${order._id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.order.orderId, order.orderId);
});

test('the guessable daily order number no longer exposes an order publicly', async () => {
  const order = await placeArtisanOrder();
  const res = await request(h.app).get(`/api/v1/public/orders/${order.orderId}`);
  assert.equal(res.status, 404);
  assert.equal(res.body.data, undefined);
  assert.ok(!JSON.stringify(res.body).includes(order.customerPhone), 'customer phone leaked');
});

test('the daily order number cannot cancel, mark paid, or request a refund', async () => {
  const order = await placeArtisanOrder('ONLINE');
  for (const action of ['cancel', 'mark-paid', 'request-refund']) {
    const res = await request(h.app).put(`/api/v1/public/orders/${order.orderId}/${action}`).send({ reason: 'x' });
    assert.equal(res.status, 404, `${action}: ${JSON.stringify(res.body)}`);
  }
  const after = await Order.findById(order._id);
  assert.equal(after!.orderStatus, 'PLACED');
  assert.equal(after!.customerMarkedPaidAt, undefined);
  assert.equal(after!.refundRequestedAt, undefined);
});

test('junk ids are a clean 404, never a 500', async () => {
  for (const id of ['aaaaaaaaaaaa', 'not-an-id', '000000000000000000000000', '%24ne']) {
    const res = await request(h.app).get(`/api/v1/public/orders/${id}`);
    assert.equal(res.status, 404, `${id}: ${res.status}`);
  }
});

test('customer actions still work by _id', async () => {
  const toMark = await placeArtisanOrder('ONLINE');
  const marked = await request(h.app).put(`/api/v1/public/orders/${toMark._id}/mark-paid`);
  assert.equal(marked.status, 200, JSON.stringify(marked.body));
  assert.ok((await Order.findById(toMark._id))!.customerMarkedPaidAt);

  const toCancel = await placeArtisanOrder();
  const cancelled = await request(h.app).put(`/api/v1/public/orders/${toCancel._id}/cancel`);
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal((await Order.findById(toCancel._id))!.orderStatus, 'CANCELLED');
});

// --- Staff endpoints ------------------------------------------------------------------------

test("staff can open their own café's orders and bills by either id", async () => {
  const order = await placeArtisanOrder();
  for (const id of [order._id, order.orderId]) {
    const details = await request(h.app).get(`/api/v1/orders/${id}`).set('Authorization', `Bearer ${artisanOwner}`);
    assert.equal(details.status, 200, `details ${id}`);
    assert.equal(details.body.data.order.orderId, order.orderId);
    const bill = await request(h.app).get(`/api/v1/orders/${id}/bill`).set('Authorization', `Bearer ${artisanOwner}`);
    assert.equal(bill.status, 200, `bill ${id}`);
    assert.equal(bill.body.data.orderId, order.orderId);
  }
});

test("another café's staff cannot open the order or its bill", async () => {
  const order = await placeArtisanOrder();
  for (const id of [order._id, order.orderId]) {
    const details = await request(h.app).get(`/api/v1/orders/${id}`).set('Authorization', `Bearer ${beanOwner}`);
    assert.equal(details.status, 404, `details ${id}`);
    const bill = await request(h.app).get(`/api/v1/orders/${id}/bill`).set('Authorization', `Bearer ${beanOwner}`);
    assert.equal(bill.status, 404, `bill ${id}`);
    assert.ok(!JSON.stringify(bill.body).includes(order.customerPhone), 'customer phone leaked');
  }
});

test('a super admin can open any order, but a chosen business scope is honoured', async () => {
  const order = await placeArtisanOrder();
  const global = await request(h.app).get(`/api/v1/orders/${order.orderId}`).set('Authorization', `Bearer ${superAdmin}`);
  assert.equal(global.status, 200);
  const scopedElsewhere = await request(h.app)
    .get(`/api/v1/orders/${order.orderId}/bill`)
    .set('Authorization', `Bearer ${superAdmin}`)
    .set('x-business-id', beanId);
  assert.equal(scopedElsewhere.status, 404);
});

test('staff endpoints still require a login', async () => {
  const order = await placeArtisanOrder();
  const res = await request(h.app).get(`/api/v1/orders/${order._id}`);
  assert.equal(res.status, 401);
});
