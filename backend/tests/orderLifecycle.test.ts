// The rules every staff/owner status change goes through: only a new order can be cancelled,
// nothing moves back to New, a finished order stays finished (except refunding a cancelled,
// paid one), and a customer can't cancel an order that's already paid.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, createOrderPlacer, Harness } from './helpers';
import { Order } from '../src/models/Order';
import { FinancialLedger } from '../src/models/FinancialLedger';

let h: Harness;
let owner: string;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  owner = await tokenFor('owner@artisan.com');
  placeOrder = await createOrderPlacer(h.app, 'lifecycle');
});
after(async () => {
  await h.stop();
});

const setStatus = (id: string, status: string) =>
  request(h.app).put(`/api/v1/orders/${id}/status`).set('Authorization', `Bearer ${owner}`).send({ status });

const confirmPayment = async (id: string) => {
  const res = await request(h.app).put(`/api/v1/orders/${id}/confirm-payment`).set('Authorization', `Bearer ${owner}`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
};

const statusOf = async (id: string) => (await Order.findById(id))!.orderStatus;

test('a new order can be cancelled; once accepted it cannot', async () => {
  const fresh = await placeOrder();
  assert.equal((await setStatus(fresh._id, 'CANCELLED')).status, 200);
  assert.equal(await statusOf(fresh._id), 'CANCELLED');

  const accepted = await placeOrder();
  assert.equal((await setStatus(accepted._id, 'CONFIRMED')).status, 200);
  const refused = await setStatus(accepted._id, 'CANCELLED');
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error.code, 'CANNOT_CANCEL');

  assert.equal((await setStatus(accepted._id, 'PREPARING')).status, 200);
  assert.equal((await setStatus(accepted._id, 'CANCELLED')).status, 400);
  assert.equal(await statusOf(accepted._id), 'PREPARING');

  // The bulk endpoint applies the same rule per order.
  const bulk = await request(h.app)
    .put('/api/v1/orders/bulk-status')
    .set('Authorization', `Bearer ${owner}`)
    .send({ orderIds: [accepted._id], status: 'CANCELLED' });
  assert.equal(bulk.body.data.updated.length, 0);
  assert.equal(bulk.body.data.failed.length, 1);
  assert.equal(await statusOf(accepted._id), 'PREPARING');
});

test("an order can't be moved back to New, so the cancel rule can't be sidestepped", async () => {
  const order = await placeOrder();
  assert.equal((await setStatus(order._id, 'CONFIRMED')).status, 200);
  const back = await setStatus(order._id, 'PLACED');
  assert.equal(back.status, 400);
  assert.equal(back.body.error.code, 'INVALID_TRANSITION');
  assert.equal(await statusOf(order._id), 'CONFIRMED');
});

test('a completed order stays completed', async () => {
  const order = await placeOrder();
  assert.equal((await setStatus(order._id, 'COMPLETED')).status, 200);
  const reopened = await setStatus(order._id, 'CONFIRMED');
  assert.equal(reopened.status, 400);
  assert.equal(reopened.body.error.code, 'ORDER_FINISHED');
  assert.equal((await setStatus(order._id, 'CANCELLED')).status, 400);
  assert.equal(await statusOf(order._id), 'COMPLETED');
});

test('a paid new order can be cancelled and refunded, and a refund is final', async () => {
  const order = await placeOrder();
  await confirmPayment(order._id);
  assert.equal((await setStatus(order._id, 'CANCELLED')).status, 200);
  assert.equal((await setStatus(order._id, 'REFUNDED')).status, 200);

  // Who did it shows on the staff order list, but the customer's tracking page gets no names.
  const list = await request(h.app).get('/api/v1/orders').query({ q: order.orderId }).set('Authorization', `Bearer ${owner}`);
  const row = list.body.data.find((o: any) => o._id === order._id);
  assert.equal(row.cancelledByUserId.role, 'OWNER');
  assert.equal(row.refundedByUserId.role, 'OWNER');
  assert.ok(row.refundedByUserId.name);
  const tracking = await request(h.app).get(`/api/v1/public/orders/${order._id}`);
  assert.equal(typeof tracking.body.data.order.refundedByUserId, 'string');
  assert.equal(typeof tracking.body.data.order.cancelledByUserId, 'string');

  const ledger = async (type: string) => FinancialLedger.countDocuments({ orderId: order._id, type });
  assert.equal(await ledger('ORDER_PAYMENT'), 1);
  assert.equal(await ledger('REFUND'), 1);

  // Used to flip the order back to PAID and write the payment ledger a second time.
  const completed = await setStatus(order._id, 'COMPLETED');
  assert.equal(completed.status, 400);
  const after = await Order.findById(order._id);
  assert.equal(after!.orderStatus, 'REFUNDED');
  assert.equal(after!.paymentStatus, 'REFUNDED');
  assert.equal(await ledger('ORDER_PAYMENT'), 1);
});

test('a customer can cancel an unpaid new order, but not a paid one', async () => {
  const unpaid = await placeOrder();
  const cancelled = await request(h.app).put(`/api/v1/public/orders/${unpaid._id}/cancel`);
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
  assert.equal(await statusOf(unpaid._id), 'CANCELLED');

  const paid = await placeOrder();
  await confirmPayment(paid._id);
  const refused = await request(h.app).put(`/api/v1/public/orders/${paid._id}/cancel`);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error.code, 'CANNOT_CANCEL');
  assert.equal(await statusOf(paid._id), 'PLACED');
});
