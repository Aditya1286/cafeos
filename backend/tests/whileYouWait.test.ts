// Café identity, Task 12: the tracker's "while you wait" block. Pairings from real co-orders only,
// a "N in 10" share only from at least 20 orders, and a daily question that rotates and is answered
// once per order, by the phone that placed it.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, businessIdFor, Harness } from './helpers';
import { Business } from '../src/models/Business';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { GuestProfile } from '../src/models/GuestProfile';
import { GUEST_QUESTIONS } from '../src/constants/guestQuestions';
import { signDeviceProof, signGuestPass } from '../src/utils/guestToken';
import { clearPairingCache } from '../src/services/pairings.service';

let h: Harness;
let artisanId: string;
let A: string;
let B: string;
let seq = 0;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
  const cat = await Category.create({ businessId: artisanId, name: 'Wait Cat' });
  const [pa, pb] = await Product.insertMany([
    { businessId: artisanId, categoryId: cat._id, name: 'Masala Chai Wait', pricePaise: 4000 },
    { businessId: artisanId, categoryId: cat._id, name: 'Bun Maska Wait', pricePaise: 6000 }
  ]);
  A = pa._id.toString();
  B = pb._id.toString();
});
after(async () => {
  await h.stop();
});
beforeEach(async () => {
  // Every order of the café counts towards co-orders, the guests' own included.
  await Order.deleteMany({ businessId: artisanId });
  clearPairingCache();
});

const item = (productId: string, name: string, pricePaise: number) => ({ productId, name, pricePaise, quantity: 1, itemTotalPaise: pricePaise });

/** Past orders of other guests: `n` with A, the first `withB` of them also with B. */
const seed = async (n: number, withB: number) => {
  await Order.insertMany(
    Array.from({ length: n }, (_, i) => ({
      orderId: `SEED-${++seq}`,
      orderNumber: `SEED-${seq}`,
      businessId: artisanId,
      tableName: 'Seed',
      customerName: 'Seed',
      customerPhone: '9000000000',
      orderStatus: 'COMPLETED',
      items: i < withB ? [item(A, 'Masala Chai Wait', 4000), item(B, 'Bun Maska Wait', 6000)] : [item(A, 'Masala Chai Wait', 4000)],
      subtotalPaise: 10000,
      totalAmountPaise: 10000,
      businessEarningsPaise: 9800
    }))
  );
};

let phoneSeq = 0;
const freshPhone = () => `93${String(++phoneSeq).padStart(8, '0')}`;

/** The guest's own order with A, placed with proof, so it carries a pass and a profile. */
const guestOrder = async (phone: string, opts: { pass?: string } = {}) => {
  const qrToken = `tok_wait_${++seq}`;
  await Table.create({ businessId: artisanId, tableNumber: `Wait ${seq}`, capacity: 2, qrToken });
  await VerifiedPhone.updateOne(
    { mobile: `91${phone}`, purpose: 'ORDER' },
    { $set: { expiresAt: new Date(Date.now() + 86_400_000) } },
    { upsert: true }
  );
  const req = request(h.app).post('/api/v1/public/orders');
  if (opts.pass) req.set('X-Guest-Token', opts.pass);
  const res = await req.send({
    qrToken,
    customerName: 'Asha',
    customerPhone: phone,
    paymentMethod: 'CASH',
    items: [{ productId: A, quantity: 1 }],
    ...(opts.pass ? {} : { deviceProof: signDeviceProof(phone) })
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.ok(res.body.data.guestToken);
  return { id: res.body.data._id as string, pass: res.body.data.guestToken as string };
};

const wait = async (id: string) => {
  const res = await request(h.app).get(`/api/v1/public/orders/${id}/while-you-wait`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data as { pairings: any[]; question: any };
};

const answer = (id: string, pass: string | null, questionId: string, optionId: string) => {
  const req = request(h.app).post(`/api/v1/public/orders/${id}/answer`);
  if (pass) req.set('X-Guest-Token', pass);
  return req.send({ questionId, optionId });
};

test('5 past orders with A+B: an order with A is offered B, addable while unpaid', async () => {
  await seed(5, 5);
  const { id } = await guestOrder(freshPhone());
  const { pairings } = await wait(id);
  assert.equal(pairings.length, 1);
  assert.equal(pairings[0].productId, B);
  assert.equal(pairings[0].name, 'Bun Maska Wait');
  assert.equal(pairings[0].pricePaise, 6000);
  assert.equal(pairings[0].addable, true);
  assert.ok(pairings[0].line.includes('Bun Maska Wait'));
  assert.doesNotMatch(pairings[0].line, /\d/);
});

test('4 past orders with A+B: no pairing', async () => {
  await seed(4, 4);
  const { id } = await guestOrder(freshPhone());
  assert.deepEqual((await wait(id)).pairings, []);
});

test('no pairingShare line below 20 orders; a real share at 20', async () => {
  await seed(19, 19);
  const below = await guestOrder(freshPhone());
  assert.doesNotMatch((await wait(below.id)).pairings[0].line, /in 10/);

  await Order.deleteMany({ businessId: artisanId });
  clearPairingCache();
  await seed(20, 14);
  const at = await guestOrder(freshPhone());
  assert.match((await wait(at.id)).pairings[0].line, /^7 in 10 /);
});

test('a paid or checkout order shows pairings without the add button', async () => {
  await seed(5, 5);
  const { id } = await guestOrder(freshPhone());
  await Order.updateOne({ _id: id }, { paymentStatus: 'PAID' });
  assert.equal((await wait(id)).pairings[0].addable, false);
});

test('a READY order gets nothing while you wait', async () => {
  await seed(5, 5);
  const { id } = await guestOrder(freshPhone());
  await Order.updateOne({ _id: id }, { orderStatus: 'READY' });
  assert.deepEqual(await wait(id), { pairings: [], question: null });
});

test('gate off: nothing while you wait', async () => {
  await seed(5, 5);
  const { id } = await guestOrder(freshPhone());
  await Business.updateOne({ _id: artisanId }, { 'identity.enabled': false });
  try {
    assert.deepEqual(await wait(id), { pairings: [], question: null });
  } finally {
    await Business.updateOne({ _id: artisanId }, { 'identity.enabled': true });
  }
});

test('questions rotate: the same order keeps its question, the next order gets another', async () => {
  const phone = freshPhone();
  const first = await guestOrder(phone);
  const q1 = (await wait(first.id)).question;
  assert.ok(q1?.id);
  assert.ok(q1.options.length >= 2);
  assert.equal('reply' in q1.options[0], false);
  assert.equal((await wait(first.id)).question.id, q1.id);

  const second = await guestOrder(phone, { pass: first.pass });
  const q2 = (await wait(second.id)).question;
  assert.ok(q2?.id);
  assert.notEqual(q2.id, q1.id);
});

test('answering with the order’s pass: the bank’s reply, remembered; twice is refused', async () => {
  const phone = freshPhone();
  const { id, pass } = await guestOrder(phone);
  const q = (await wait(id)).question;
  const option = GUEST_QUESTIONS.find((x) => x.id === q.id)!.options[0];

  const res = await answer(id, pass, q.id, option.id);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data, { reply: option.reply, gesture: option.replyGesture });
  const profile = await GuestProfile.findOne({ businessId: artisanId, phone });
  assert.equal(profile!.answers.get(q.id)!.optionId, option.id);
  assert.equal((await wait(id)).question, null);

  const again = await answer(id, pass, q.id, option.id);
  assert.equal(again.status, 400);
  assert.equal(again.body.error.code, 'ALREADY_ANSWERED');
});

test('answering with another phone’s pass (or none) → 403; junk ids → 400', async () => {
  const phone = freshPhone();
  const { id, pass } = await guestOrder(phone);
  const q = (await wait(id)).question;
  const optionId = GUEST_QUESTIONS.find((x) => x.id === q.id)!.options[0].id;

  const other = signGuestPass({ phone: freshPhone(), businessId: artisanId }).token;
  const res = await answer(id, other, q.id, optionId);
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'NOT_YOUR_ORDER');
  assert.equal((await answer(id, null, q.id, optionId)).status, 403);

  const junk = await answer(id, pass, q.id, 'no-such-option');
  assert.equal(junk.status, 400);
  assert.equal(junk.body.error.code, 'INVALID_ANSWER');
  assert.equal((await GuestProfile.findOne({ businessId: artisanId, phone }))!.answers.size, 0);
});
