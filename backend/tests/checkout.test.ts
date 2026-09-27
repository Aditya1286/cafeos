// SMEPay Wizard Checkout: the per-business opt-in, and the guarantee that an order exists only
// once SMEPay has validated the payment — exactly one, no matter which path (status poll, sweep,
// retry, switch) notices it first. SMEPay itself is a local stub server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import { Socket as ClientSocket } from 'socket.io-client';
import {
  startHarness, tokenFor, superAdminToken, businessIdFor, firstProductIdFor, connectSocket, join, nextEvent, noEvent, Harness
} from './helpers';
import { config } from '../src/config';
import businessRoutes from '../src/routes/businessRoutes';
import adminRoutes from '../src/routes/adminRoutes';
import paymentRoutes from '../src/routes/paymentRoutes';
import { Order } from '../src/models/Order';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { FinancialLedger } from '../src/models/FinancialLedger';
import { CheckoutSession } from '../src/models/CheckoutSession';
import { SmepayAccount } from '../src/models/SmepayAccount';
import { sweepOnce } from '../src/services/checkout.service';

// ── Stub SMEPay ─────────────────────────────────────────────────────────────

const GOOD_CLIENT = { clientId: 'client_artisan', clientSecret: 'secret_artisan' };

interface StubOrder {
  ref: string;
  amountPaise: number;
  callbackUrl: string;
  status: string;
  valid?: boolean; // an explicit verdict; real SMEPay (staging) usually leaves it out
}

const stub = {
  orders: new Map<string, StubOrder>(), // by slug
  creates: 0,
  server: null as http.Server | null,
  url: ''
};

const startStub = async () => {
  const app = express();
  app.use(express.json());
  const authed = (req: express.Request) => req.headers.authorization === 'Bearer stub_token';

  app.post('/api/wiz/external/auth', (req, res) => {
    if (req.body.client_id === GOOD_CLIENT.clientId && req.body.client_secret === GOOD_CLIENT.clientSecret) {
      return res.json({ access_token: 'stub_token', token_type: 'Bearer', expires_in: 600, environment: 'test' });
    }
    return res.status(401).json({ message: 'Invalid client credentials' });
  });
  app.post('/api/wiz/external/order/create', (req, res) => {
    if (!authed(req)) return res.status(401).json({ message: 'Unauthorized' });
    stub.creates++;
    const slug = `slug_${stub.creates}`;
    stub.orders.set(slug, {
      ref: req.body.order_id,
      amountPaise: Math.round(Number(req.body.amount) * 100),
      callbackUrl: req.body.callback_url,
      status: 'CREATED'
    });
    return res.json({
      status: true,
      order_id: `SME${stub.creates}`,
      order_slug: slug,
      payment_url: `https://pay.stub/${slug}`,
      ref_id: `ORD__${stub.creates}`,
      payment_status: 'CREATED'
    });
  });
  app.post('/api/wiz/external/order/validate', (req, res) => {
    if (!authed(req)) return res.status(401).json({ message: 'Unauthorized' });
    // Answers like SMEPay staging does: an unknown slug or a wrong amount is a 404, and a match is
    // just {status, payment_status}, with no `valid` flag unless a test sets one.
    const order = stub.orders.get(req.body.slug);
    if (!order || Math.round(Number(req.body.amount) * 100) !== order.amountPaise) {
      return res.status(404).json({ message: 'Not found', status: false });
    }
    return res.json({ payment_status: order.status, status: true, ...(order.valid === undefined ? {} : { valid: order.valid }) });
  });
  app.post('/api/partner/merchants/tsp/auth', (_req, res) => res.json({ token: 'partner_token' }));
  app.post('/api/partner/merchants/extended', (req, res) => {
    if (req.headers.authorization !== 'Bearer partner_token') return res.status(401).json({ message: 'Unauthorized' });
    return res.status(201).json({ message: 'Merchant created successfully', business_id: 'smepay_biz_1', kyc_url: 'https://kyc.stub/smepay_biz_1' });
  });

  stub.server = http.createServer(app);
  await new Promise<void>((resolve) => stub.server!.listen(0, '127.0.0.1', resolve));
  stub.url = `http://127.0.0.1:${(stub.server!.address() as AddressInfo).port}`;
};

const setPaymentStatus = (slug: string, status: string, valid?: boolean) => {
  const order = stub.orders.get(slug);
  assert.ok(order, `no stub order ${slug}`);
  order.status = status;
  order.valid = valid;
};

// ── Harness ─────────────────────────────────────────────────────────────────

let h: Harness;
let artisanId: string;
let productId: string;
let owner: string;
let superAdmin: string;
let ownerSocket: ClientSocket;
let seq = 0;

before(async () => {
  await startStub();
  config.smepayBaseUrl = stub.url;
  config.smepayPartnerBaseUrl = stub.url;
  config.smepayPartnerCode = 'PARTNER_TEST';
  config.smepayPartnerEmail = 'partner@test.local';

  h = await startHarness();
  h.app.use('/api/v1/business', businessRoutes);
  h.app.use('/api/v1/admin', adminRoutes);
  h.app.use('/api/v1/payments', paymentRoutes);

  artisanId = await businessIdFor('artisan-cafe');
  productId = await firstProductIdFor('artisan-cafe');
  owner = await tokenFor('owner@artisan.com');
  superAdmin = await superAdminToken();
  ownerSocket = await connectSocket(h.url, owner);
  assert.deepEqual(await join(ownerSocket, 'join_business_room', artisanId), { ok: true });
});
after(async () => {
  ownerSocket?.close();
  await h.stop();
  await new Promise<void>((resolve) => stub.server!.close(() => resolve()));
});

/** A fresh table + already-verified phone, so every checkout is independent. */
const freshCustomer = async () => {
  seq++;
  const qrToken = `tok_checkout_${seq}`;
  const phone = `97${String(seq).padStart(8, '0')}`;
  await Table.create({ businessId: artisanId, tableNumber: `Checkout ${seq}`, capacity: 2, qrToken });
  await VerifiedPhone.create({ mobile: `91${phone}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  return { qrToken, phone };
};

const startCheckout = async () => {
  const { qrToken, phone } = await freshCustomer();
  const res = await request(h.app)
    .post('/api/v1/public/checkout')
    .send({ qrToken, customerName: 'Checkout Customer', customerPhone: phone, items: [{ productId, quantity: 2 }] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const slug = String(res.body.data.paymentUrl).split('/').pop()!;
  assert.equal(res.body.data.slug, slug); // what the frontend opens SMEPay's popup with
  return { ...res.body.data, slug } as { id: string; status: string; paymentUrl: string; amountPaise: number; slug: string };
};

const artisanOrderCount = () => Order.countDocuments({ businessId: artisanId });

// For work that runs after the response has gone out (the webhook's check).
const waitFor = async (condition: () => Promise<boolean>, ms = 3000) => {
  const deadline = Date.now() + ms;
  while (!(await condition())) {
    assert.ok(Date.now() < deadline, 'timed out waiting');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

// ── Opt-in ──────────────────────────────────────────────────────────────────

test('checkout is off for existing businesses until allowed and enabled', async () => {
  const menu = await request(h.app).get('/api/v1/public/c/artisan-cafe');
  assert.equal(menu.status, 200);
  assert.equal(menu.body.data.checkoutAvailable, false);

  const { qrToken, phone } = await freshCustomer();
  const res = await request(h.app)
    .post('/api/v1/public/checkout')
    .send({ qrToken, customerName: 'Early Bird', customerPhone: phone, items: [{ productId, quantity: 1 }] });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'CHECKOUT_UNAVAILABLE');
});

test('the owner cannot set up checkout before a super admin allows it', async () => {
  const res = await request(h.app)
    .put('/api/v1/business/checkout/credentials')
    .set('Authorization', `Bearer ${owner}`)
    .send(GOOD_CLIENT);
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'CHECKOUT_NOT_ALLOWED');
});

test('allow → onboard → connect → enable', async () => {
  const allow = await request(h.app)
    .put(`/api/v1/admin/businesses/${artisanId}/checkout`)
    .set('Authorization', `Bearer ${superAdmin}`)
    .send({ allowed: true });
  assert.equal(allow.status, 200, JSON.stringify(allow.body));
  assert.equal(allow.body.data.checkoutAllowed, true);

  const onboard = await request(h.app).post('/api/v1/business/checkout/onboard').set('Authorization', `Bearer ${owner}`);
  assert.equal(onboard.status, 200, JSON.stringify(onboard.body));
  assert.equal(onboard.body.data.account.onboardingStatus, 'KYC_PENDING');
  assert.equal(onboard.body.data.account.kycUrl, 'https://kyc.stub/smepay_biz_1');

  const early = await request(h.app)
    .put('/api/v1/business/checkout/enabled')
    .set('Authorization', `Bearer ${owner}`)
    .send({ enabled: true });
  assert.equal(early.status, 400);
  assert.equal(early.body.error.code, 'CHECKOUT_NOT_READY');

  const bad = await request(h.app)
    .put('/api/v1/business/checkout/credentials')
    .set('Authorization', `Bearer ${owner}`)
    .send({ clientId: GOOD_CLIENT.clientId, clientSecret: 'wrong' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.error.code, 'SMEPAY_AUTH_FAILED');

  const good = await request(h.app)
    .put('/api/v1/business/checkout/credentials')
    .set('Authorization', `Bearer ${owner}`)
    .send(GOOD_CLIENT);
  assert.equal(good.status, 200, JSON.stringify(good.body));
  assert.equal(good.body.data.account.onboardingStatus, 'CONNECTED');
  assert.equal(good.body.data.account.hasClientSecret, true);
  assert.ok(!JSON.stringify(good.body).includes(GOOD_CLIENT.clientSecret), 'secret echoed back');

  const stored = await SmepayAccount.findOne({ businessId: artisanId }).select('+clientSecretEnc');
  assert.ok(stored?.clientSecretEnc && !stored.clientSecretEnc.includes(GOOD_CLIENT.clientSecret), 'secret stored in plaintext');

  const enable = await request(h.app)
    .put('/api/v1/business/checkout/enabled')
    .set('Authorization', `Bearer ${owner}`)
    .send({ enabled: true });
  assert.equal(enable.status, 200, JSON.stringify(enable.body));
  assert.equal(enable.body.data.checkoutAvailable, true);

  const menu = await request(h.app).get('/api/v1/public/c/artisan-cafe');
  assert.equal(menu.body.data.checkoutAvailable, true);
  assert.ok(!JSON.stringify(menu.body).includes(GOOD_CLIENT.clientId), 'SMEPay credentials leaked on the public business');
});

// ── Payment → order ─────────────────────────────────────────────────────────

test('starting a checkout creates no order and tells the kitchen nothing', async () => {
  const before = await artisanOrderCount();
  const quiet = noEvent(ownerSocket, 'order:new');
  const session = await startCheckout();
  assert.equal(session.status, 'PENDING');
  assert.match(session.paymentUrl, /^https:\/\/pay\.stub\//);
  assert.ok(await quiet, 'order:new emitted before payment');
  assert.equal(await artisanOrderCount(), before);

  const status = await request(h.app).get(`/api/v1/public/checkout/${session.id}`);
  assert.equal(status.body.data.status, 'PENDING');
  assert.equal(status.body.data.orderId, null);
  assert.equal(await artisanOrderCount(), before);
});

test('a validated SUCCESS creates exactly one paid CHECKOUT order', async () => {
  const session = await startCheckout();
  setPaymentStatus(session.slug, 'SUCCESS');

  const kitchen = nextEvent(ownerSocket, 'order:new');
  const res = await request(h.app).get(`/api/v1/public/checkout/${session.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'PAID');
  const orderId = res.body.data.orderId;
  assert.ok(orderId);

  const order = await Order.findById(orderId);
  assert.equal(order!.paymentStatus, 'PAID');
  assert.equal(order!.paymentMethod, 'CHECKOUT');
  assert.equal(order!.paymentProvider, 'SMEPAY');
  assert.equal(order!.totalAmountPaise, session.amountPaise);
  assert.equal(order!.orderStatus, 'PLACED');
  assert.equal((await kitchen).paymentStatus, 'PAID');
  assert.equal(await FinancialLedger.countDocuments({ orderId }), 2);
});

test('concurrent status polls and the sweep still produce a single order', async () => {
  const session = await startCheckout();
  setPaymentStatus(session.slug, 'SUCCESS');

  await Promise.all([
    request(h.app).get(`/api/v1/public/checkout/${session.id}`),
    request(h.app).get(`/api/v1/public/checkout/${session.id}`),
    sweepOnce(),
    sweepOnce()
  ]);

  const orders = await Order.find({ checkoutSessionId: session.id });
  assert.equal(orders.length, 1);
  assert.equal(await FinancialLedger.countDocuments({ orderId: orders[0]._id }), 2);
  assert.equal((await CheckoutSession.findById(session.id))!.status, 'PAID');
});

test('SMEPay saying valid:false never pays, whatever the status', async () => {
  const session = await startCheckout();
  setPaymentStatus(session.slug, 'SUCCESS', false);
  await sweepOnce();
  assert.equal(await Order.countDocuments({ checkoutSessionId: session.id }), 0);
  assert.equal((await CheckoutSession.findById(session.id))!.status, 'PENDING');
});

test("staging's TEST_ statuses count as the real ones outside production", async () => {
  const session = await startCheckout();
  setPaymentStatus(session.slug, 'TEST_FAILED');
  await sweepOnce();
  // Stored as FAILED, so the attempt is final and the customer is offered a retry.
  assert.equal((await CheckoutSession.findById(session.id))!.attempts[0].lastStatus, 'FAILED');

  const retried = await request(h.app).post(`/api/v1/public/checkout/${session.id}/retry`);
  assert.equal(retried.status, 200, JSON.stringify(retried.body));
  setPaymentStatus(retried.body.data.slug, 'TEST_SUCCESS');
  await sweepOnce();
  assert.equal((await CheckoutSession.findById(session.id))!.status, 'PAID');
  assert.equal(await Order.countDocuments({ checkoutSessionId: session.id }), 1);
});

test('in production a TEST_SUCCESS never pays for an order', async () => {
  const session = await startCheckout();
  setPaymentStatus(session.slug, 'TEST_SUCCESS');
  const nodeEnv = config.nodeEnv;
  config.nodeEnv = 'production';
  try {
    await sweepOnce();
  } finally {
    config.nodeEnv = nodeEnv;
  }
  const after = await CheckoutSession.findById(session.id);
  assert.equal(after!.status, 'PENDING');
  assert.equal(after!.attempts[0].lastStatus, 'TEST_SUCCESS');
  assert.equal(await Order.countDocuments({ checkoutSessionId: session.id }), 0);
});

test('a payment that lands after the hold window still creates the order', async () => {
  const session = await startCheckout();
  await CheckoutSession.updateOne({ _id: session.id }, { $set: { expiresAt: new Date(Date.now() - 60_000) } });
  await sweepOnce();
  assert.equal((await CheckoutSession.findById(session.id))!.status, 'EXPIRED');

  setPaymentStatus(session.slug, 'SUCCESS');
  await sweepOnce();
  const after = await CheckoutSession.findById(session.id);
  assert.equal(after!.status, 'PAID');
  assert.equal((await Order.findById(after!.orderId))!.paymentStatus, 'PAID');
});

test('switching to cash places an unpaid order; a late SMEPay payment marks that same order paid', async () => {
  const session = await startCheckout();
  const res = await request(h.app).post(`/api/v1/public/checkout/${session.id}/switch`).send({ paymentMethod: 'CASH' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'SWITCHED');
  const orderId = res.body.data.orderId;
  const switched = await Order.findById(orderId);
  assert.equal(switched!.paymentMethod, 'CASH');
  assert.equal(switched!.paymentStatus, 'UNPAID');

  setPaymentStatus(session.slug, 'SUCCESS');
  await sweepOnce();

  const orders = await Order.find({ checkoutSessionId: session.id });
  assert.equal(orders.length, 1);
  assert.equal(orders[0]._id.toString(), orderId);
  assert.equal(orders[0].paymentStatus, 'PAID');
  assert.equal(orders[0].paymentMethod, 'CHECKOUT');
  assert.equal(orders[0].transactionId, `SME${session.slug.split('_')[1]}`); // the stub's order_id for that slug
  assert.equal(await FinancialLedger.countDocuments({ orderId }), 2);
});

test('retry opens a fresh SMEPay order, but never after the last one was paid', async () => {
  const session = await startCheckout();
  setPaymentStatus(session.slug, 'FAILED');

  const retried = await request(h.app).post(`/api/v1/public/checkout/${session.id}/retry`);
  assert.equal(retried.status, 200, JSON.stringify(retried.body));
  assert.equal(retried.body.data.status, 'PENDING');
  assert.notEqual(retried.body.data.paymentUrl, session.paymentUrl);

  const secondSlug = String(retried.body.data.paymentUrl).split('/').pop()!;
  setPaymentStatus(secondSlug, 'SUCCESS');
  const createsBefore = stub.creates;
  const again = await request(h.app).post(`/api/v1/public/checkout/${session.id}/retry`);
  assert.equal(again.body.data.status, 'PAID');
  assert.equal(stub.creates, createsBefore, 'opened a new SMEPay order for an already-paid checkout');
  assert.equal(await Order.countDocuments({ checkoutSessionId: session.id }), 1);
});

// ── SMEPay's callback_url: post-payment redirect (GET) + webhook (POST) ─────

test("callback_url is the API, and its redirect lands on the customer's checkout page", async () => {
  const session = await startCheckout();
  assert.equal(
    stub.orders.get(session.slug)!.callbackUrl,
    `${config.frontendUrl}/api/v1/public/checkout/${session.id}/callback`
  );

  const res = await request(h.app).get(`/api/v1/public/checkout/${session.id}/callback`);
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, `${config.frontendUrl}/c/artisan-cafe/checkout/${session.id}`);
});

test('the webhook gets a payment confirmed without anyone polling, but its body is never trusted', async () => {
  const session = await startCheckout();
  const webhook = (status: string) =>
    request(h.app)
      .post(`/api/v1/public/checkout/${session.id}/callback`)
      .send({ ref_id: `${session.id}-1`, transaction_id: 'SME_TXN_1', status, amount: '1.00' });

  // A forged SUCCESS while SMEPay itself still says CREATED: checked, and nothing is created.
  assert.equal((await webhook('SUCCESS')).status, 200);
  await waitFor(async () => !!(await CheckoutSession.findById(session.id))!.lastCheckedAt);
  assert.equal(await Order.countDocuments({ checkoutSessionId: session.id }), 0);

  // The real one, once SMEPay's own validate agrees (past the status-check throttle).
  setPaymentStatus(session.slug, 'SUCCESS');
  await CheckoutSession.updateOne({ _id: session.id }, { $unset: { lastCheckedAt: 1 } });
  assert.equal((await webhook('SUCCESS')).status, 200);
  await waitFor(async () => (await CheckoutSession.findById(session.id))!.status === 'PAID');
  assert.equal(await Order.countDocuments({ checkoutSessionId: session.id }), 1);
});

// ── Guards ──────────────────────────────────────────────────────────────────

test('the plain order endpoint refuses to create an unpaid CHECKOUT order', async () => {
  const { qrToken, phone } = await freshCustomer();
  const res = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken, customerName: 'Sneaky', customerPhone: phone, items: [{ productId, quantity: 1 }], paymentMethod: 'CHECKOUT' });
  assert.equal(res.status, 400);
});

test('junk checkout ids are a clean 404', async () => {
  for (const id of ['not-an-id', '000000000000000000000000']) {
    const res = await request(h.app).get(`/api/v1/public/checkout/${id}`);
    assert.equal(res.status, 404, `${id}: ${res.status}`);
    const redirect = await request(h.app).get(`/api/v1/public/checkout/${id}/callback`);
    assert.equal(redirect.status, 404, `${id} callback: ${redirect.status}`);
    // Webhooks are always acknowledged; an unknown id just isn't checked.
    assert.equal((await request(h.app).post(`/api/v1/public/checkout/${id}/callback`)).status, 200);
  }
});

test('the old unauthenticated "mark any order paid" endpoint is gone', async () => {
  const order = await Order.findOne({ businessId: artisanId, paymentStatus: 'UNPAID' });
  const res = await request(h.app).post('/api/v1/payments/process').send({ orderId: order?._id });
  assert.equal(res.status, 404);
  if (order) assert.equal((await Order.findById(order._id))!.paymentStatus, 'UNPAID');
});
