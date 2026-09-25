// Server-side Socket.IO room authorization (websocket/socketAuth.ts) and what each room
// actually delivers — including the Super Admin live order feed (admin:orders).
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Socket as ClientSocket } from 'socket.io-client';
import {
  startHarness,
  tokenFor,
  superAdminToken,
  businessIdFor,
  createOrderPlacer,
  connectSocket,
  join,
  nextEvent,
  noEvent,
  Harness
} from './helpers';
import { config } from '../src/config';
import { User } from '../src/models/User';
import { Business } from '../src/models/Business';

let h: Harness;
let artisanId: string;
let beanId: string;
let artisanOwner: string;
let beanOwner: string;
let superAdmin: string;
let placeArtisanOrder: Awaited<ReturnType<typeof createOrderPlacer>>;
const open: ClientSocket[] = [];

const connect = async (token?: string) => {
  const s = await connectSocket(h.url, token);
  open.push(s);
  return s;
};

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  beanId = await businessIdFor('bean-and-butter');
  artisanOwner = await tokenFor('owner@artisan.com');
  beanOwner = await tokenFor('owner@beanandbutter.com');
  superAdmin = await superAdminToken();
  placeArtisanOrder = await createOrderPlacer(h.app, 'socket');
});
afterEach(() => {
  while (open.length) open.pop()!.disconnect();
});
after(async () => {
  await h.stop();
});

// --- Business rooms ---------------------------------------------------------------------

test('anonymous sockets connect but cannot join any business room', async () => {
  const s = await connect();
  assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: false, code: 'UNAUTHORIZED' });
});

test('an owner can join their own business room', async () => {
  const s = await connect(artisanOwner);
  assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: true });
});

test("an owner cannot join another business's room", async () => {
  const s = await connect(beanOwner);
  assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: false, code: 'FORBIDDEN' });
});

test('staff roles are scoped the same way as owners', async () => {
  const s = await connect(await tokenFor('staff@artisan.com'));
  assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: true });
  assert.deepEqual(await join(s, 'join_business_room', beanId), { ok: false, code: 'FORBIDDEN' });
});

test('a super admin can join any business room', async () => {
  const s = await connect(superAdmin);
  assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: true });
  assert.deepEqual(await join(s, 'join_business_room', beanId), { ok: true });
});

test('garbage business ids are rejected', async () => {
  const s = await connect(superAdmin);
  for (const bad of ['', 'not-an-id', { $ne: null }, 42, null]) {
    assert.deepEqual(await join(s, 'join_business_room', bad), { ok: false, code: 'INVALID_ID' }, JSON.stringify(bad));
  }
});

test('a forged, expired, or wrong-secret token is treated as anonymous', async () => {
  const decoded = jwt.decode(artisanOwner) as any;
  const forged = jwt.sign({ id: decoded.id, role: 'SUPER_ADMIN' }, 'not-the-secret');
  const expired = jwt.sign({ id: decoded.id }, config.jwtSecret, { expiresIn: -10 });
  for (const token of [forged, expired, 'garbage']) {
    const s = await connect(token);
    assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: false, code: 'UNAUTHORIZED' });
  }
});

test('a deactivated user is refused even with a still-valid token', async () => {
  const token = await tokenFor('staff@beanandbutter.com');
  await User.updateOne({ email: 'staff@beanandbutter.com' }, { status: 'INACTIVE' });
  try {
    const s = await connect(token);
    assert.deepEqual(await join(s, 'join_business_room', beanId), { ok: false, code: 'UNAUTHORIZED' });
  } finally {
    await User.updateOne({ email: 'staff@beanandbutter.com' }, { status: 'ACTIVE' });
  }
});

test('the role/businessId inside the token are not trusted — only the DB user is', async () => {
  const decoded = jwt.decode(beanOwner) as any;
  // Validly signed (e.g. minted before a role change) but claiming super admin + artisan:
  // the socket must still act as the real bean-and-butter owner.
  const lying = jwt.sign({ id: decoded.id, role: 'SUPER_ADMIN', businessId: artisanId }, config.jwtSecret);
  const s = await connect(lying);
  assert.deepEqual(await join(s, 'join_business_room', artisanId), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await join(s, 'join_admin_support_room'), { ok: false, code: 'FORBIDDEN' });
});

// --- Admin rooms --------------------------------------------------------------------------

test('only a super admin can join the admin support room', async () => {
  assert.deepEqual(await join(await connect(), 'join_admin_support_room'), { ok: false, code: 'UNAUTHORIZED' });
  assert.deepEqual(await join(await connect(artisanOwner), 'join_admin_support_room'), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await join(await connect(superAdmin), 'join_admin_support_room'), { ok: true });
});

test('only a super admin can join the live order feed', async () => {
  assert.deepEqual(await join(await connect(), 'join_admin_orders_room'), { ok: false, code: 'UNAUTHORIZED' });
  assert.deepEqual(await join(await connect(artisanOwner), 'join_admin_orders_room'), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await join(await connect(superAdmin), 'join_admin_orders_room'), { ok: true });
});

// --- Order rooms ------------------------------------------------------------------------

test('anyone holding the order _id (the tracking URL) can follow that order', async () => {
  const order = await placeArtisanOrder();
  assert.deepEqual(await join(await connect(), 'join_order_room', order._id), { ok: true });
});

test('guessable daily order numbers, unknown ids, and junk are refused', async () => {
  const order = await placeArtisanOrder();
  const s = await connect();
  assert.deepEqual(await join(s, 'join_order_room', order.orderId), { ok: false, code: 'INVALID_ID' });
  assert.deepEqual(await join(s, 'join_order_room', new mongoose.Types.ObjectId().toString()), { ok: false, code: 'NOT_FOUND' });
  // 12-char strings pass mongoose's isValid but aren't a real hex _id.
  assert.deepEqual(await join(s, 'join_order_room', 'aaaaaaaaaaaa'), { ok: false, code: 'INVALID_ID' });
  assert.deepEqual(await join(s, 'join_order_room', { $gt: '' }), { ok: false, code: 'INVALID_ID' });
});

// --- End-to-end delivery: what actually reaches whom ------------------------------------

test('a new order reaches its own business and super admins, and nobody else', async () => {
  const owner = await connect(artisanOwner);
  const admin = await connect(superAdmin);
  const otherOwner = await connect(beanOwner);
  const anon = await connect();
  await join(owner, 'join_business_room', artisanId);
  await join(admin, 'join_business_room', artisanId);
  await join(otherOwner, 'join_business_room', artisanId); // refused
  await join(anon, 'join_business_room', artisanId); // refused

  const ownerGot = nextEvent(owner, 'order:new');
  const adminGot = nextEvent(admin, 'order:new');
  const otherSilent = noEvent(otherOwner, 'order:new');
  const anonSilent = noEvent(anon, 'order:new');

  const order = await placeArtisanOrder();
  assert.equal((await ownerGot).orderId, order.orderId);
  assert.equal((await adminGot).orderId, order.orderId);
  assert.equal(await otherSilent, true, 'another business received the order');
  assert.equal(await anonSilent, true, 'an anonymous socket received the order');
});

test('status changes reach the tracking customer and the business, not other orders', async () => {
  const order = await placeArtisanOrder();
  const otherOrder = await placeArtisanOrder();

  const customer = await connect();
  const otherCustomer = await connect();
  const owner = await connect(artisanOwner);
  assert.deepEqual(await join(customer, 'join_order_room', order._id), { ok: true });
  assert.deepEqual(await join(otherCustomer, 'join_order_room', otherOrder._id), { ok: true });
  await join(owner, 'join_business_room', artisanId);

  const customerGot = nextEvent(customer, 'order:status_updated');
  const ownerGot = nextEvent(owner, 'order:updated');
  const otherSilent = noEvent(otherCustomer, 'order:status_updated');

  const res = await request(h.app)
    .put(`/api/v1/orders/${order._id}/status`)
    .set('Authorization', `Bearer ${artisanOwner}`)
    .send({ status: 'CONFIRMED' });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  assert.equal((await customerGot).orderStatus, 'CONFIRMED');
  assert.equal((await ownerGot).orderStatus, 'CONFIRMED');
  assert.equal(await otherSilent, true, "another customer received this order's update");
});

test('a join without an ack callback (older clients) still works and does not crash', async () => {
  const owner = await connect(artisanOwner);
  owner.emit('join_business_room', artisanId); // fire-and-forget, as the pre-auth frontend did
  await new Promise((r) => setTimeout(r, 100));
  const got = nextEvent(owner, 'order:new');
  const order = await placeArtisanOrder();
  assert.equal((await got).orderId, order.orderId);
});

// --- Super Admin live order feed (admin:orders) -------------------------------------------

test('the feed gets every new order in the overview row shape, and owners get none of it', async () => {
  const admin = await connect(superAdmin);
  const owner = await connect(artisanOwner);
  await join(admin, 'join_admin_orders_room');
  await join(owner, 'join_admin_orders_room'); // refused

  const adminGot = nextEvent(admin, 'admin_order:new');
  const ownerSilent = noEvent(owner, 'admin_order:new');
  const order = await placeArtisanOrder();

  const row = await adminGot;
  assert.equal(row._id, order._id);
  assert.equal(row.orderNumber, order.orderId);
  assert.equal(row.businessName, 'The Artisan Roastery & Café');
  assert.equal(row.status, 'PLACED');
  assert.equal(row.itemsCount, 1);
  assert.equal(typeof row.total, 'number');
  assert.equal(row.customerPhone, undefined, 'the feed row should not carry customer phones');
  assert.equal(await ownerSilent, true);
});

test('status changes and customer cancellations update the feed', async () => {
  const admin = await connect(superAdmin);
  await join(admin, 'join_admin_orders_room');

  const confirmed = await placeArtisanOrder();
  const gotConfirm = nextEvent(admin, 'admin_order:updated');
  await request(h.app)
    .put(`/api/v1/orders/${confirmed._id}/status`)
    .set('Authorization', `Bearer ${artisanOwner}`)
    .send({ status: 'CONFIRMED' });
  assert.deepEqual(await gotConfirm, { _id: confirmed._id, status: 'CONFIRMED' });

  const cancelled = await placeArtisanOrder();
  const gotCancel = nextEvent(admin, 'admin_order:updated');
  await request(h.app).put(`/api/v1/public/orders/${cancelled._id}/cancel`);
  assert.deepEqual(await gotCancel, { _id: cancelled._id, status: 'CANCELLED' });
});

test('demo businesses stay out of the feed while demo exclusion is on', async () => {
  const admin = await connect(superAdmin);
  await join(admin, 'join_admin_orders_room');
  const previous = config.excludeDemoBusinessesFromAnalytics;
  config.excludeDemoBusinessesFromAnalytics = true;
  await Business.updateOne({ _id: artisanId }, { isDemo: true });
  try {
    const silent = noEvent(admin, 'admin_order:new', 800);
    await placeArtisanOrder();
    assert.equal(await silent, true, 'a demo order reached the live feed');
  } finally {
    config.excludeDemoBusinessesFromAnalytics = previous;
    await Business.updateOne({ _id: artisanId }, { isDemo: false });
  }
});
