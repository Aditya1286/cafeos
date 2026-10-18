// The public demo café's safety rails (src/demo/demoGuard.ts, visitorSweep.ts): guests' numbers are
// partly hidden, the owner login can't change anything but the kitchen board, visitors' own orders
// are swept away, and none of it touches a café that isn't a demo one. Ordering itself works as at
// any café, phone OTP included.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { startHarness, Harness } from './helpers';
import { demo } from '../src/config';
import authRoutes from '../src/routes/authRoutes';
import orderRoutes from '../src/routes/orderRoutes';
import analyticsRoutes from '../src/routes/analyticsRoutes';
import tableRoutes from '../src/routes/tableRoutes';
import publicRoutes from '../src/routes/publicRoutes';
import demoRoutes from '../src/demo/demo.routes';
import { demoGuard, maskPhone, maskPhones } from '../src/demo/demoGuard';
import { upsertVerifiedPhone } from '../src/dao/verifiedPhone.dao';
import { sweepVisitorOrders } from '../src/demo/visitorSweep';
import { DEMO_CAFES } from '../src/demo/cafes';
import { provisionCafe, ownerEmailOf, CafeContext } from '../src/demo/provision';
import { Business } from '../src/models/Business';
import { Order } from '../src/models/Order';
import { Product } from '../src/models/Product';
import { User } from '../src/models/User';

const KEY = 'test-demo-key-0123456789abcdef';
const PASSWORD = 'demo-pass-123';
const LOAMLINE = DEMO_CAFES.find((c) => c.slug === 'loamline-coffee')!;

let h: Harness;
let app: express.Express;
let ctx: CafeContext;

before(async () => {
  h = await startHarness();
  app = express();
  app.use(express.json());
  app.use('/api/v1', demoGuard);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/tables', tableRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/demo', demoRoutes);
  demo.accountPassword = PASSWORD;
  demo.tickKey = KEY;
  const result = await provisionCafe(LOAMLINE);
  assert.ok(result.ok, JSON.stringify(result));
  ctx = result.ctx;
});
after(async () => {
  demo.tickKey = '';
  await h.stop();
});

let nextPhone = 9876500000;
/** A real-looking visitor number that has passed the OTP, as it would after the guest verified it. */
const verifiedVisitor = async () => {
  const phone = String(nextPhone++);
  await upsertVerifiedPhone(`91${phone}`, 'ORDER', new Date(Date.now() + 60_000));
  return phone;
};
const loginOwner = async () =>
  (await request(app).post('/api/v1/auth/login').send({ email: ownerEmailOf(LOAMLINE), password: PASSWORD })).body.data.token as string;
const visitorOrder = async (phone: string, slug: string, name = 'Rahul') => {
  const product = await Product.findOne({ businessId: ctx.business._id, isAvailable: true });
  return request(app).post('/api/v1/public/orders').send({
    customerName: name, customerPhone: phone, paymentMethod: 'CASH', businessSlug: slug,
    items: [{ productId: String(product!._id), quantity: 1, name: product!.name }], idempotencyKey: `t-${Math.random()}`
  });
};

test("Loamline's UPI ID comes from its definition, including for a café that already exists", async () => {
  assert.equal((await Business.findById(ctx.business._id))!.upiVpa, '6006646578@slc');

  await Business.updateOne({ _id: ctx.business._id }, { $set: { upiVpa: '' } });
  const again = await provisionCafe(LOAMLINE);
  assert.ok(again.ok);
  assert.equal((await Business.findById(ctx.business._id))!.upiVpa, '6006646578@slc');

  const others = await Business.find({ slug: { $in: ['chiguru-tiffin-room', 'crumbwell-bakehouse'] } });
  for (const other of others) assert.equal(other.upiVpa, '', 'the other demo cafés still take payment at the counter');
});

test('phone numbers are shown as the first two and last four digits', () => {
  assert.equal(maskPhone('9876543412'), '98••••3412');
  assert.equal(maskPhone('+91 98765 43412'), '98••••3412');
  assert.equal(maskPhone('123'), '••••');
  const masked = maskPhones({ data: [{ customerPhone: '9876543412', customerName: 'A', customer: { phone: '9811112222' } }] });
  assert.deepEqual(masked, { data: [{ customerPhone: '98••••3412', customerName: 'A', customer: { phone: '98••••2222' } }] });
});

test('ordering at the demo café needs a verified phone, like anywhere else', async () => {
  const res = await visitorOrder('9876599999', LOAMLINE.slug);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'PHONE_NOT_VERIFIED');
});

test('a visitor orders at the demo café with their own number, and the owner sees it hidden', async () => {
  const phone = await verifiedVisitor();
  const placed = await visitorOrder(phone, LOAMLINE.slug);
  assert.equal(placed.status, 201, JSON.stringify(placed.body));

  const token = await loginOwner();
  const list = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
  assert.equal(list.status, 200);
  const text = JSON.stringify(list.body);
  assert.doesNotMatch(text, /"customerPhone":"\d{10}"/, 'no full number reaches the demo owner');
  assert.match(text, /"customerPhone":"98••••\d{4}"/);
});

test('the demo owner can run the kitchen but cannot change anything else', async () => {
  const token = await loginOwner();
  const blocked = await request(app).post('/api/v1/tables').set('Authorization', `Bearer ${token}`).send({ tableNumber: 'Table 99', capacity: 2 });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, 'DEMO_READ_ONLY');

  // The analytics tab reads with a POST; the guard must not mistake that for a change.
  const charts = await request(app).post('/api/v1/analytics/query').set('Authorization', `Bearer ${token}`).send({});
  assert.notEqual(charts.body?.error?.code, 'DEMO_READ_ONLY');

  const phone = await verifiedVisitor();
  const placed = await visitorOrder(phone, LOAMLINE.slug);
  const moved = await request(app).put(`/api/v1/orders/${placed.body.data._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'PREPARING' });
  assert.notEqual(moved.body?.error?.code, 'DEMO_READ_ONLY');
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
});

test('a guest can order even in a browser that is signed in as the demo owner', async () => {
  // The browser sends the owner's login with every request, guest ones included.
  const token = await loginOwner();
  const phone = await verifiedVisitor();
  const product = await Product.findOne({ businessId: ctx.business._id, isAvailable: true });
  const res = await request(app)
    .post('/api/v1/public/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      customerName: 'Rahul', customerPhone: phone, paymentMethod: 'CASH', businessSlug: LOAMLINE.slug,
      items: [{ productId: String(product!._id), quantity: 1, name: product!.name }], idempotencyKey: `t-${Math.random()}`
    });
  assert.notEqual(res.body?.error?.code, 'DEMO_READ_ONLY');
  assert.equal(res.status, 201, JSON.stringify(res.body));

  // Nor does it stop that browser signing in as someone else.
  const login = await request(app).post('/api/v1/auth/login').set('Authorization', `Bearer ${token}`).send({ email: 'owner@artisan.com', password: 'password123' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
});

test('a café that is not a demo one is left completely alone', async () => {
  const real = await Business.findOne({ slug: { $nin: DEMO_CAFES.map((c) => c.slug) } });
  const owner = await User.findOne({ businessId: real!._id, role: 'OWNER' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: owner!.email, password: 'password123' });
  const token = login.body.data.token;
  const res = await request(app).post('/api/v1/tables').set('Authorization', `Bearer ${token}`).send({ tableNumber: 'Table 98', capacity: 2 });
  assert.notEqual(res.body?.error?.code, 'DEMO_READ_ONLY');
  assert.ok(res.status < 400, JSON.stringify(res.body));
});

test('a visitor\'s orders are deleted a few hours later, and the simulator\'s are not', async () => {
  const phone = await verifiedVisitor();
  const placed = await visitorOrder(phone, LOAMLINE.slug, 'Rahul Verma');
  const id = placed.body.data._id;
  // A second order, then made to look like the simulator's (whose numbers start with 5).
  const other = await visitorOrder(await verifiedVisitor(), LOAMLINE.slug, 'Sim Customer');
  const simulated = { _id: new mongoose.Types.ObjectId(other.body.data._id) };
  await Order.collection.updateOne({ _id: simulated._id }, { $set: { customerPhone: '5100000042' } });
  const now = new Date();

  assert.equal(await sweepVisitorOrders(ctx.business._id, now), 0, 'a fresh order stays (the guest is still watching it)');
  // createdAt is immutable through Mongoose, so age the orders underneath it.
  const old = new Date(now.getTime() - 7 * 3600_000);
  await Order.collection.updateMany({ _id: { $in: [new mongoose.Types.ObjectId(id), simulated._id] } }, { $set: { createdAt: old } });
  assert.equal(await sweepVisitorOrders(ctx.business._id, now), 1);
  assert.equal(await Order.findById(id), null, "the visitor's order and the number on it are gone");
  assert.ok(await Order.findById(simulated._id), 'simulated orders are untouched');
});
