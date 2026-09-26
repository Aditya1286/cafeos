// Staff accounts: an owner creates and manages them for their own business only; a staff login
// can work orders but nothing owner-only, and deactivating or resetting it ends their session.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, businessIdFor, createOrderPlacer, Harness } from './helpers';
import authRoutes from '../src/routes/authRoutes';
import staffRoutes from '../src/routes/staffRoutes';
import accountRoutes from '../src/routes/accountRoutes';
import { Subscription } from '../src/models/Subscription';
import { SubscriptionPlan } from '../src/models/SubscriptionPlan';

let h: Harness;
let owner: string;
let otherOwner: string;
let artisanId: string;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;
let seq = 0;

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/auth', authRoutes);
  h.app.use('/api/v1/staff', staffRoutes);
  h.app.use('/api/v1/account', accountRoutes);
  owner = await tokenFor('owner@artisan.com');
  otherOwner = await tokenFor('owner@beanandbutter.com');
  artisanId = await businessIdFor('artisan-cafe');
  placeOrder = await createOrderPlacer(h.app, 'staff');
});
after(async () => {
  await h.stop();
});

const PASSWORD = 'kitchen-pass-1';

const createStaff = async (overrides: Record<string, unknown> = {}) => {
  seq++;
  return request(h.app)
    .post('/api/v1/staff')
    .set('Authorization', `Bearer ${owner}`)
    .send({ name: `Cook ${seq}`, email: `cook${seq}@artisan.com`, password: PASSWORD, ...overrides });
};

const login = (email: string, password: string) => request(h.app).post('/api/v1/auth/login').send({ email, password });

const staffLogin = async () => {
  const created = await createStaff();
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const res = await login(created.body.data.email, PASSWORD);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { staff: created.body.data, token: res.body.data.token as string };
};

test('an owner creates a staff login that belongs to their business', async () => {
  const { staff, token } = await staffLogin();
  const me = await request(h.app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(me.body.data.user.role, 'STAFF');
  assert.equal(String(me.body.data.user.businessId), artisanId);

  const list = await request(h.app).get('/api/v1/staff').set('Authorization', `Bearer ${owner}`);
  assert.ok(list.body.data.staff.some((s: any) => s.id === staff.id));
  assert.ok(!JSON.stringify(list.body).includes('passwordHash'));
});

test('bad input and duplicate emails are rejected', async () => {
  assert.equal((await createStaff({ password: 'short' })).status, 400);
  assert.equal((await createStaff({ email: 'not-an-email' })).status, 400);
  const dup = await createStaff({ email: 'owner@artisan.com' });
  assert.equal(dup.status, 400);
  assert.equal(dup.body.error.code, 'EMAIL_EXISTS');
});

test('staff can work orders, but not refunds or anything owner-only', async () => {
  const { token } = await staffLogin();
  const order = await placeOrder();

  const orders = await request(h.app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`);
  assert.equal(orders.status, 200);

  const accept = await request(h.app)
    .put(`/api/v1/orders/${order._id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'CONFIRMED' });
  assert.equal(accept.status, 200, JSON.stringify(accept.body));

  const refund = await request(h.app)
    .put(`/api/v1/orders/${order._id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'REFUNDED' });
  assert.equal(refund.status, 403);

  assert.equal((await request(h.app).get('/api/v1/staff').set('Authorization', `Bearer ${token}`)).status, 403);
  const menu = await request(h.app).post('/api/v1/menu/products').set('Authorization', `Bearer ${token}`).send({ name: 'x' });
  assert.equal(menu.status, 403);
});

test("an owner can't see or touch another business's staff", async () => {
  const { staff } = await staffLogin();
  const res = await request(h.app)
    .put(`/api/v1/staff/${staff.id}`)
    .set('Authorization', `Bearer ${otherOwner}`)
    .send({ name: 'Hijacked' });
  assert.equal(res.status, 404);
  const list = await request(h.app).get('/api/v1/staff').set('Authorization', `Bearer ${otherOwner}`);
  assert.ok(!list.body.data.staff.some((s: any) => s.id === staff.id));
});

test('the owner changes a staff email without an OTP, and resets their password (logging them out)', async () => {
  const { staff, token } = await staffLogin();

  const edited = await request(h.app)
    .put(`/api/v1/staff/${staff.id}`)
    .set('Authorization', `Bearer ${owner}`)
    .send({ email: `renamed-${staff.email}` });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));

  const reset = await request(h.app)
    .put(`/api/v1/staff/${staff.id}/password`)
    .set('Authorization', `Bearer ${owner}`)
    .send({ password: 'brand-new-pass' });
  assert.equal(reset.status, 200);

  assert.equal((await request(h.app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status, 401);
  assert.equal((await login(`renamed-${staff.email}`, PASSWORD)).status, 401);
  assert.equal((await login(`renamed-${staff.email}`, 'brand-new-pass')).status, 200);
});

test('deactivating staff blocks login and ends their session immediately', async () => {
  const { staff, token } = await staffLogin();
  const res = await request(h.app)
    .put(`/api/v1/staff/${staff.id}/status`)
    .set('Authorization', `Bearer ${owner}`)
    .send({ status: 'INACTIVE' });
  assert.equal(res.status, 200);
  assert.equal((await request(h.app).get('/api/v1/orders').set('Authorization', `Bearer ${token}`)).status, 401);
  assert.equal((await login(staff.email, PASSWORD)).status, 403);
});

test("the plan's staff limit caps active staff, not deactivated ones", async () => {
  const freePlan = await SubscriptionPlan.findOne({ code: 'FREE' });
  await Subscription.updateOne({ businessId: artisanId }, { $set: { planId: freePlan!._id } });
  const maxActive = freePlan!.limits.maxStaff;

  // Start from zero active staff (earlier tests left some behind).
  const setStatus = (id: string, status: string) =>
    request(h.app).put(`/api/v1/staff/${id}/status`).set('Authorization', `Bearer ${owner}`).send({ status });
  const before = (await request(h.app).get('/api/v1/staff').set('Authorization', `Bearer ${owner}`)).body.data;
  for (const s of before.staff.filter((s: any) => s.status === 'ACTIVE')) await setStatus(s.id, 'INACTIVE');

  const created: string[] = [];
  for (let i = 0; i < maxActive; i++) {
    const res = await createStaff();
    assert.equal(res.status, 201, JSON.stringify(res.body));
    created.push(res.body.data.id);
  }
  const over = await createStaff();
  assert.equal(over.status, 403);
  assert.equal(over.body.error.code, 'STAFF_LIMIT_REACHED');

  // Deactivating frees a slot; reactivating while full is refused.
  await setStatus(created[0], 'INACTIVE');
  assert.equal((await createStaff()).status, 201);
  assert.equal((await setStatus(created[0], 'ACTIVE')).status, 403);
});
