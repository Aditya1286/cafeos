// "Find my order": a customer who lost their tracking link (cleared browser, new phone) proves the
// phone number with a FRESH OTP and gets back the links for that number's recent orders at the café.
// A long-lived ORDER verification (14 days, reusable) must never be enough: it is keyed by phone
// alone, so anyone who knows a number could otherwise read that person's orders.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { startHarness, createOrderPlacer, businessIdFor, firstProductIdFor, Harness } from './helpers';
import { Order } from '../src/models/Order';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { RECOVERY_WINDOW_HOURS } from '../src/services/orderRecovery.service';
import { signRecoveryToken, RECOVERY_SESSION_TTL_SECONDS } from '../src/utils/recoveryToken';

let h: Harness;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;
let qrToken: string;

before(async () => {
  h = await startHarness();
  placeOrder = await createOrderPlacer(h.app, 'recover');
  const artisanId = await businessIdFor('artisan-cafe');
  qrToken = 'tok_recover_scan';
  await Table.create({ businessId: artisanId, tableNumber: 'Recover scan', capacity: 2, qrToken });
});
after(async () => {
  await h.stop();
});
beforeEach(async () => {
  await VerifiedPhone.deleteMany({ purpose: 'RECOVERY' });
});

const recover = (body: Record<string, unknown>) => request(h.app).post('/api/v1/public/orders/recover').send(body);

/** The mock-mode OTP round trip, asking for a recovery verification. */
const verifyForRecovery = async (phone: string) => {
  const sent = await request(h.app).post('/api/v1/public/otp/request').send({ phone, purpose: 'RECOVERY' });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.code, 'OTP_SENT', 'recovery always sends a fresh code, even to a phone already verified for ordering');
  const done = await request(h.app).post('/api/v1/public/otp/verify').send({ phone, otp: sent.body.debugOtp, purpose: 'RECOVERY' });
  assert.equal(done.status, 200, JSON.stringify(done.body));
};

const backdate = (id: string, ms: number) =>
  Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt: new Date(Date.now() - ms) } });

test('a phone that is merely verified for ordering is NOT enough', async () => {
  const order = await placeOrder(); // placing an order leaves the phone ORDER-verified for 14 days
  assert.ok(await VerifiedPhone.findOne({ mobile: `91${order.customerPhone}`, purpose: 'ORDER' }));

  const res = await recover({ qrToken, customerPhone: order.customerPhone });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'VERIFICATION_REQUIRED');
  assert.equal(JSON.stringify(res.body).includes(order._id), false, 'nothing about the order leaks');
});

test('the OTP status for recovery is never "already verified"', async () => {
  const order = await placeOrder();
  const status = await request(h.app).get('/api/v1/public/otp/status').query({ phone: order.customerPhone, purpose: 'RECOVERY' });
  assert.equal(status.body.verified, false);
});

test('after a fresh OTP, the phone gets back its own order links, newest first, with minimal fields', async () => {
  const first = await placeOrder();
  const phone = first.customerPhone;
  // A second order from the same number (placeOrder gives each call a new phone, so make one directly).
  const artisanId = await businessIdFor('artisan-cafe');
  await Table.create({ businessId: artisanId, tableNumber: 'Recover second', capacity: 2, qrToken: 'tok_recover_second' });
  const productId = await firstProductIdFor('artisan-cafe');
  const second = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken: 'tok_recover_second', customerName: 'Someone', customerPhone: phone, items: [{ productId, quantity: 1 }], paymentMethod: 'CASH' });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  await backdate(first._id, 5 * 60_000);

  await verifyForRecovery(phone);
  const res = await recover({ qrToken, customerPhone: phone });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(
    res.body.data.map((o: any) => o._id),
    [second.body.data._id, first._id],
    'newest first'
  );
  for (const o of res.body.data) {
    assert.deepEqual(Object.keys(o).sort(), ['_id', 'createdAt', 'orderNumber', 'orderStatus', 'tableName', 'totalAmountPaise']);
  }
  const text = JSON.stringify(res.body);
  assert.equal(text.includes(phone), false, 'the phone number is not echoed back');
  assert.equal(text.includes('Test Customer'), false, 'no customer name');
});

test('only that phone’s orders: not other customers at the same café, and not other cafés', async () => {
  const mine = await placeOrder();
  const theirs = await placeOrder(); // different phone, same café
  await verifyForRecovery(mine.customerPhone);

  const res = await recover({ qrToken, customerPhone: mine.customerPhone });
  const ids = res.body.data.map((o: any) => o._id);
  assert.ok(ids.includes(mine._id));
  assert.ok(!ids.includes(theirs._id));

  // The same verified number looks up another café: nothing from artisan comes back.
  const other = await recover({ businessSlug: 'bean-and-butter', customerPhone: mine.customerPhone });
  assert.equal(other.status, 200);
  assert.deepEqual(other.body.data, []);
});

test('the verification belongs to one number: verifying A does not unlock B', async () => {
  const a = await placeOrder();
  const b = await placeOrder();
  await verifyForRecovery(a.customerPhone);
  const res = await recover({ qrToken, customerPhone: b.customerPhone });
  assert.equal(res.status, 403);
});

test('orders older than the recovery window are not offered', async () => {
  const old = await placeOrder();
  await backdate(old._id, (RECOVERY_WINDOW_HOURS + 1) * 3_600_000);
  await verifyForRecovery(old.customerPhone);
  const res = await recover({ qrToken, customerPhone: old.customerPhone });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, []);
});

test('a verification that has expired is no longer enough', async () => {
  const order = await placeOrder();
  await verifyForRecovery(order.customerPhone);
  await VerifiedPhone.updateOne({ mobile: `91${order.customerPhone}`, purpose: 'RECOVERY' }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const res = await recover({ qrToken, customerPhone: order.customerPhone });
  assert.equal(res.status, 403);
});

test('works for a counter/menu-link order too (business slug instead of a table QR)', async () => {
  const order = await placeOrder();
  await verifyForRecovery(order.customerPhone);
  const res = await recover({ businessSlug: 'artisan-cafe', customerPhone: order.customerPhone });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.some((o: any) => o._id === order._id));
});

test('finds an order the phone gave with a +91 prefix or spaces', async () => {
  const artisanId = await businessIdFor('artisan-cafe');
  const productId = await firstProductIdFor('artisan-cafe');
  await Table.create({ businessId: artisanId, tableNumber: 'Recover fmt', capacity: 2, qrToken: 'tok_recover_fmt' });
  await VerifiedPhone.create({ mobile: '919777700001', purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  const placed = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken: 'tok_recover_fmt', customerName: 'Fmt', customerPhone: '9777700001', items: [{ productId, quantity: 1 }], paymentMethod: 'CASH' });
  await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(placed.body.data._id) }, { $set: { customerPhone: '+91 97777 00001' } });

  await verifyForRecovery('9777700001');
  const res = await recover({ qrToken, customerPhone: '+91 97777 00001' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.data.some((o: any) => o._id === placed.body.data._id));
});

test('bad input is refused plainly', async () => {
  assert.equal((await recover({ qrToken })).status, 400); // no phone
  assert.equal((await recover({ customerPhone: '9876543210' })).status, 400); // no café
  assert.equal((await recover({ qrToken, customerPhone: '123' })).status, 400); // not a phone
  assert.equal((await recover({ qrToken: { $ne: null }, customerPhone: '9876543210' })).status, 400); // operator injection
  assert.equal((await recover({ qrToken, customerPhone: { $gt: '' } })).status, 400);
  assert.equal((await recover({ qrToken: 'tok_does_not_exist', customerPhone: '9876543210' })).status, 404);
  assert.equal((await recover({ businessSlug: 'no-such-cafe', customerPhone: '9876543210' })).status, 404);
});

// --- Remembering the verification on this device ("my orders") ---------------------------------
// After one fresh OTP the server hands back a signed, expiring token for that number at that café.
// The page keeps it, so the same number's other orders can be listed again without another code.

/** Verifies the number with an OTP and returns the lookup response (data + session). */
const lookupWithOtp = async (phone: string, body: Record<string, unknown> = { qrToken }) => {
  await verifyForRecovery(phone);
  const res = await recover({ ...body, customerPhone: phone });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
};

const placeAnother = async (phone: string, tableToken: string) => {
  const productId = await firstProductIdFor('artisan-cafe');
  const res = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken: tableToken, customerName: 'Someone', customerPhone: phone, items: [{ productId, quantity: 1 }], paymentMethod: 'CASH' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data._id as string;
};

test('a fresh OTP lookup also returns a 12-hour session token for that number at that café', async () => {
  const order = await placeOrder();
  const body = await lookupWithOtp(order.customerPhone);
  assert.equal(typeof body.session.token, 'string');
  const ttl = new Date(body.session.expiresAt).getTime() - Date.now();
  assert.ok(Math.abs(ttl - RECOVERY_SESSION_TTL_SECONDS * 1000) < 60_000, `expires in ~12h, got ${ttl}ms`);
  assert.equal(RECOVERY_SESSION_TTL_SECONDS, 12 * 3600);
  assert.equal(JSON.stringify(body.session).includes(order.customerPhone), false, 'the phone is not echoed in the session');
});

test('the token lists the same number’s orders with no OTP, and sees orders placed afterwards', async () => {
  const first = await placeOrder();
  const { session } = await lookupWithOtp(first.customerPhone);
  await VerifiedPhone.deleteMany({ purpose: 'RECOVERY' }); // the OTP is long gone: only the token remains

  const again = await recover({ qrToken, recoveryToken: session.token });
  assert.equal(again.status, 200, JSON.stringify(again.body));
  assert.deepEqual(again.body.data.map((o: any) => o._id), [first._id]);
  assert.equal(again.body.session, undefined, 'a token lookup does not mint a longer-lived one');

  await Table.create({ businessId: await businessIdFor('artisan-cafe'), tableNumber: 'Recover later', capacity: 2, qrToken: 'tok_recover_later' });
  const laterId = await placeAnother(first.customerPhone, 'tok_recover_later');
  const later = await recover({ businessSlug: 'artisan-cafe', recoveryToken: session.token }); // by the café link too
  assert.deepEqual(later.body.data.map((o: any) => o._id), [laterId, first._id], 'newest first, including the new order');
  for (const o of later.body.data) {
    assert.deepEqual(Object.keys(o).sort(), ['_id', 'createdAt', 'orderNumber', 'orderStatus', 'tableName', 'totalAmountPaise']);
  }
});

test('the token belongs to its number: a phone in the body cannot widen it', async () => {
  const mine = await placeOrder();
  const theirs = await placeOrder();
  const { session } = await lookupWithOtp(mine.customerPhone);
  const res = await recover({ qrToken, recoveryToken: session.token, customerPhone: theirs.customerPhone });
  assert.equal(res.status, 200);
  const ids = res.body.data.map((o: any) => o._id);
  assert.ok(ids.includes(mine._id));
  assert.ok(!ids.includes(theirs._id), 'someone else’s order never comes back');
});

test('the token belongs to its café: it is useless anywhere else', async () => {
  const order = await placeOrder();
  const { session } = await lookupWithOtp(order.customerPhone);
  const res = await recover({ businessSlug: 'bean-and-butter', recoveryToken: session.token });
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'SESSION_EXPIRED');
});

test('expired, tampered, garbage and look-alike tokens are all refused the same way', async () => {
  const order = await placeOrder();
  const businessId = await businessIdFor('artisan-cafe');
  const ten = order.customerPhone;
  const expired = signRecoveryToken({ phone: ten, businessId }, -60).token;
  const good = signRecoveryToken({ phone: ten, businessId }).token;
  const [head, payload, sig] = good.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), ten: '9999999999' })).toString('base64url');
  // A real login JWT, signed with the app's JWT secret: it must never work as a recovery token.
  const loginJwt = jwt.sign({ id: businessId, role: 'OWNER', businessId, typ: 'order-recovery', ten, bid: businessId }, config.jwtSecret, { expiresIn: '7d' });
  // Same secret-derived key but not meant as one of ours (no recovery claims).
  const wrongKind = jwt.sign({ id: businessId }, config.jwtSecret, { expiresIn: '1h' });

  for (const bad of [expired, `${head}.${forgedPayload}.${sig}`, `${good}x`, 'not-a-token', '', loginJwt, wrongKind]) {
    const res = await recover({ qrToken, recoveryToken: bad });
    if (bad === '') {
      assert.equal(res.status, 400, 'an empty token is just a missing phone/token');
      continue;
    }
    assert.equal(res.status, 401, `token ${bad.slice(0, 20)}…`);
    assert.equal(res.body.error.code, 'SESSION_EXPIRED');
    assert.equal(JSON.stringify(res.body).includes(order._id), false);
  }
  assert.equal((await recover({ qrToken, recoveryToken: 12345 })).status, 400);
  assert.equal((await recover({ qrToken, recoveryToken: { $ne: null } })).status, 400);
});

test('a recovery token is not a login: it cannot open any staff or admin route', async () => {
  const order = await placeOrder();
  const { session } = await lookupWithOtp(order.customerPhone);
  const res = await request(h.app).get('/api/v1/orders/active').set('Authorization', `Bearer ${session.token}`);
  assert.equal(res.status, 401);
  const admin = await request(h.app).get('/api/v1/admin/businesses').set('Authorization', `Bearer ${session.token}`);
  assert.equal(admin.status, 401);
});
