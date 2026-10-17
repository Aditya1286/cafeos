// The amend-order flow (spec §10.7): POST /public/orders/:id/add-items. Money parity with a fresh
// order, the status/payment/limit rules, the race against a kitchen status change, and the emit.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { Business } from '../src/models/Business';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { IdentityEvent } from '../src/models/IdentityEvent';
import { FinancialLedger } from '../src/models/FinancialLedger';
import { InventoryItem } from '../src/models/InventoryItem';
import { InventoryTransaction } from '../src/models/InventoryTransaction';
import { Recipe } from '../src/models/Recipe';
import { statusChangeTestHooks } from '../src/controllers/orderController';
import { Table } from '../src/models/Table';
import { VerifiedPhone } from '../src/models/VerifiedPhone';
import { signGuestPass } from '../src/utils/guestToken';
import { canAmend, amendTestHooks, AMEND_MAX_PER_ORDER, AMEND_MAX_UNITS } from '../src/services/orderAmendment.service';
import { startHarness, Harness, businessIdFor, tokenFor, connectSocket, join, nextEvent } from './helpers';

let h: Harness;
let artisanId: string;
let beanId: string;
let productA: string;
let productB: string;
let seq = 0;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  beanId = await businessIdFor('bean-and-butter');
  const products = await Product.find({ businessId: artisanId, isAvailable: true }).sort({ pricePaise: 1 }).limit(2);
  assert.equal(products.length, 2);
  [productA, productB] = products.map((p) => p._id.toString());
});
after(async () => {
  amendTestHooks.afterPricing = undefined;
  await h.stop();
});
beforeEach(async () => {
  amendTestHooks.afterPricing = undefined;
  statusChangeTestHooks.beforeWrite = undefined;
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true, enabledAt: new Date() }, taxRatePercentage: 5 });
});

/** Places an UNPAID cash order at the artisan café through the public endpoint. */
const place = async (items: { productId: string; quantity: number }[]) => {
  seq++;
  const qrToken = `tok_amend_${seq}`;
  const phone = `97${String(seq).padStart(8, '0')}`;
  await Table.create({ businessId: artisanId, tableNumber: `Amend ${seq}`, capacity: 2, qrToken });
  await VerifiedPhone.create({ mobile: `91${phone}`, purpose: 'ORDER', expiresAt: new Date(Date.now() + 86_400_000) });
  const res = await request(h.app)
    .post('/api/v1/public/orders')
    .send({ qrToken, customerName: 'Amend Guest', customerPhone: phone, items, paymentMethod: 'CASH' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const pass = signGuestPass({ phone, businessId: artisanId }).token;
  return { id: res.body.data._id as string, phone, pass };
};

const addItems = (id: string, pass: string | undefined, items: unknown, source: unknown = 'pairing') => {
  const req = request(h.app).post(`/api/v1/public/orders/${id}/add-items`).send({ items, source });
  return pass ? req.set('X-Guest-Token', pass) : req;
};

const money = (o: any) => ({
  subtotalPaise: o.subtotalPaise,
  taxPaise: o.taxPaise,
  platformFeePaise: o.platformFeePaise,
  totalAmountPaise: o.totalAmountPaise,
  businessEarningsPaise: o.businessEarningsPaise
});

test('parity: an order amended with B has the totals of a fresh order with A+B', async () => {
  // Quantities chosen so rounding GST per part would differ from GST on the whole subtotal.
  const amended = await place([{ productId: productA, quantity: 1 }]);
  const res = await addItems(amended.id, amended.pass, [{ productId: productB, quantity: 3 }]);
  assert.equal(res.status, 200, JSON.stringify(res.body));

  const fresh = await place([
    { productId: productA, quantity: 1 },
    { productId: productB, quantity: 3 }
  ]);
  const a = await Order.findById(amended.id).lean();
  const f = await Order.findById(fresh.id).lean();
  assert.deepEqual(money(a), money(f));
  assert.ok(a!.taxPaise > 0);
  assert.equal(a!.items.length, 2);
  assert.equal(a!.amendments.length, 1);
  assert.equal(a!.amendments[0].source, 'pairing');
  assert.equal(a!.amendments[0].items[0].quantity, 3);
  assert.equal(a!.amendments[0].items[0].productId.toString(), productB);
  // The amendment records exactly what it added to the total.
  const before = await place([{ productId: productA, quantity: 1 }]);
  const b = await Order.findById(before.id).lean();
  assert.equal(a!.amendments[0].amountPaise, a!.totalAmountPaise - b!.totalAmountPaise);
  // The public response is the updated order, without the phone number.
  assert.equal(res.body.data.totalAmountPaise, a!.totalAmountPaise);
  assert.equal('customerPhone' in res.body.data, false);
});

test('canAmend follows the status, payment, checkout and limit rules', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  const doc = (await Order.findById(o.id))!;
  assert.equal(canAmend(doc), true);
  doc.orderStatus = 'PREPARING';
  assert.equal(canAmend(doc), true);
  doc.orderStatus = 'READY';
  assert.equal(canAmend(doc), false);
  doc.orderStatus = 'PLACED';
  doc.paymentStatus = 'PAID';
  assert.equal(canAmend(doc), false);
  doc.paymentStatus = 'UNPAID';
  doc.paymentMethod = 'CHECKOUT';
  assert.equal(canAmend(doc), false);
  assert.equal(AMEND_MAX_PER_ORDER, 3);
  assert.equal(AMEND_MAX_UNITS, 10);
});

for (const [label, change] of [
  ['a PAID order', { paymentStatus: 'PAID' }],
  ['a CHECKOUT order', { paymentMethod: 'CHECKOUT' }],
  ['a READY order', { orderStatus: 'READY' }]
] as const) {
  test(`${label} cannot be amended (409) and keeps its totals`, async () => {
    const o = await place([{ productId: productA, quantity: 1 }]);
    await Order.updateOne({ _id: o.id }, change);
    const before = await Order.findById(o.id).lean();
    const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.equal(res.body.error.code, 'ORDER_NOT_AMENDABLE');
    assert.deepEqual(money(await Order.findById(o.id).lean()), money(before));
  });
}

test('a PREPARING order can be amended', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  await Order.updateOne({ _id: o.id }, { orderStatus: 'PREPARING' });
  const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
  assert.equal(res.status, 200, JSON.stringify(res.body));
});

test('amend loses the race against a status change', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  const before = await Order.findById(o.id).lean();
  // The kitchen marks it READY after the amend priced the items but before it writes.
  amendTestHooks.afterPricing = async (orderId) => {
    await Order.updateOne({ _id: orderId }, { orderStatus: 'READY' });
  };
  const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 2 }]);
  assert.equal(res.status, 409, JSON.stringify(res.body));
  assert.equal(res.body.error.code, 'ORDER_NOT_AMENDABLE');
  const afterDoc = await Order.findById(o.id).lean();
  assert.deepEqual(money(afterDoc), money(before));
  assert.equal(afterDoc!.items.length, 1);
  assert.equal(afterDoc!.amendments.length, 0);
  assert.equal(afterDoc!.orderStatus, 'READY');
});

test('a concurrent amendment landing first makes the stale one fail, never double-count', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  let raced = false;
  amendTestHooks.afterPricing = async () => {
    if (raced) return;
    raced = true;
    amendTestHooks.afterPricing = undefined;
    const inner = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
    assert.equal(inner.status, 200, JSON.stringify(inner.body));
  };
  const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
  assert.equal(res.status, 409);
  const doc = await Order.findById(o.id).lean();
  assert.equal(doc!.amendments.length, 1);
  assert.equal(doc!.items.length, 2);
});

test('the 4th amendment is refused (409); 11 units is AMEND_LIMIT (400)', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  for (let i = 0; i < 3; i++) {
    const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
    assert.equal(res.status, 200, JSON.stringify(res.body));
  }
  const fourth = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
  assert.equal(fourth.status, 409);
  assert.equal(fourth.body.error.code, 'ORDER_NOT_AMENDABLE');

  const p = await place([{ productId: productA, quantity: 1 }]);
  const eleven = await addItems(p.id, p.pass, [{ productId: productB, quantity: 11 }]);
  assert.equal(eleven.status, 400);
  assert.equal(eleven.body.error.code, 'AMEND_LIMIT');
  // Units add up across amendments too.
  assert.equal((await addItems(p.id, p.pass, [{ productId: productB, quantity: 6 }])).status, 200);
  const over = await addItems(p.id, p.pass, [{ productId: productB, quantity: 5 }]);
  assert.equal(over.status, 400);
  assert.equal(over.body.error.code, 'AMEND_LIMIT');
});

test('a socket client in the business room receives order:updated with the new total', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  const socket = await connectSocket(h.url, await tokenFor('owner@artisan.com'));
  try {
    assert.deepEqual(await join(socket, 'join_business_room', artisanId), { ok: true });
    const event = nextEvent(socket, 'order:updated');
    const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
    assert.equal(res.status, 200);
    const payload = await event;
    assert.equal(payload.totalAmountPaise, res.body.data.totalAmountPaise);
    assert.equal(payload.orderStatus, 'PLACED');
    assert.equal('customerPhone' in payload, false);
  } finally {
    socket.close();
  }
});

test('a wrong, missing or other-café pass is refused (403)', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  const other = signGuestPass({ phone: '9111111111', businessId: artisanId }).token;
  const otherCafe = signGuestPass({ phone: o.phone, businessId: beanId }).token;
  for (const pass of [other, otherCafe, undefined, 'garbage']) {
    const res = await addItems(o.id, pass, [{ productId: productB, quantity: 1 }]);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body.error.code, 'NOT_YOUR_ORDER');
  }
  assert.equal((await Order.findById(o.id).lean())!.amendments.length, 0);
});

test('identity off, bad input and foreign products are refused', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  await Business.updateOne({ _id: artisanId }, { 'identity.enabled': false });
  const off = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
  assert.equal(off.status, 403);
  assert.equal(off.body.error.code, 'IDENTITY_OFF');
  await Business.updateOne({ _id: artisanId }, { 'identity.enabled': true });

  for (const items of [[], [{ productId: productB, quantity: 0 }], [{ productId: productB, quantity: 1.5 }], [{ productId: { $ne: null }, quantity: 1 }]]) {
    assert.equal((await addItems(o.id, o.pass, items)).status, 400);
  }
  assert.equal((await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }], 'staff')).status, 400);

  const foreign = await Product.findOne({ businessId: beanId });
  const res = await addItems(o.id, o.pass, [{ productId: foreign!._id.toString(), quantity: 1 }]);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'PRODUCT_UNAVAILABLE');

  assert.equal((await addItems('ART-000000-0001', o.pass, [{ productId: productB, quantity: 1 }])).status, 404);
  assert.equal((await Order.findById(o.id).lean())!.amendments.length, 0);
});

test('a successful amendment records pairing_ordered; a refused one does not', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  const before = await IdentityEvent.countDocuments({ kind: 'pairing_ordered' });
  assert.equal((await addItems(o.id, o.pass, [{ productId: productB, quantity: 2 }])).status, 200);
  const events = await IdentityEvent.find({ kind: 'pairing_ordered', orderId: o.id }).lean();
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].meta, { units: 2 });
  await Order.updateOne({ _id: o.id }, { orderStatus: 'READY' });
  assert.equal((await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }])).status, 409);
  assert.equal(await IdentityEvent.countDocuments({ kind: 'pairing_ordered' }), before + 1);
});

test('a guest who says they paid can no longer add (409), and the guard holds in a race too', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  await Order.updateOne({ _id: o.id }, { customerMarkedPaidAt: new Date() });
  const doc = (await Order.findById(o.id))!;
  assert.equal(canAmend(doc), false);
  const res = await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }]);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'ORDER_NOT_AMENDABLE');

  // "I've paid" lands between pricing and the write: the atomic guard refuses it.
  const p = await place([{ productId: productA, quantity: 1 }]);
  const before = await Order.findById(p.id).lean();
  amendTestHooks.afterPricing = async (orderId) => {
    await Order.updateOne({ _id: orderId }, { customerMarkedPaidAt: new Date() });
  };
  const raced = await addItems(p.id, p.pass, [{ productId: productB, quantity: 1 }]);
  assert.equal(raced.status, 409);
  assert.deepEqual(money(await Order.findById(p.id).lean()), money(before));
});

// Gives product B a recipe on a fresh inventory item, so its stock movements can be counted.
const trackStockOfB = async () => {
  await Recipe.deleteMany({ productId: productB });
  const item = await InventoryItem.create({ businessId: artisanId, name: `Amend stock ${Date.now()}`, unit: 'PIECE', currentStock: 100, minimumStockLevel: 1 });
  await Recipe.create({ businessId: artisanId, productId: productB, ingredients: [{ inventoryItemId: item._id, quantityRequired: 1 }] });
  return item._id;
};

const kitchen = async () => tokenFor('owner@artisan.com');
const setStatus = async (id: string, status: string) =>
  request(h.app).put(`/api/v1/orders/${id}/status`).set('Authorization', `Bearer ${await kitchen()}`).send({ status });

test('an amend between the kitchen loading the order and saving it is ledgered and stocked exactly once', async () => {
  const itemId = await trackStockOfB();
  const o = await place([{ productId: productA, quantity: 1 }]);
  // The kitchen marks it COMPLETED (PLACED → paid, stock off) while the guest adds 2 × B.
  statusChangeTestHooks.beforeWrite = async () => {
    statusChangeTestHooks.beforeWrite = undefined;
    const add = await addItems(o.id, o.pass, [{ productId: productB, quantity: 2 }]);
    assert.equal(add.status, 200, JSON.stringify(add.body));
  };
  const res = await setStatus(o.id, 'COMPLETED');
  assert.equal(res.status, 200, JSON.stringify(res.body));

  const final = (await Order.findById(o.id).lean())!;
  assert.equal(final.items.length, 2);
  assert.equal(final.paymentStatus, 'PAID');
  const payments = await FinancialLedger.find({ orderId: o.id, type: 'ORDER_PAYMENT' }).lean();
  assert.equal(payments.length, 1);
  assert.equal(payments[0].amountPaise, final.totalAmountPaise);
  const fees = await FinancialLedger.find({ orderId: o.id, type: 'PLATFORM_FEE' }).lean();
  assert.equal(fees[0].amountPaise, final.platformFeePaise);
  // The added lines' stock came off once (2 units of B), not zero times and not twice.
  const moves = await InventoryTransaction.find({ inventoryItemId: itemId, referenceOrderId: o.id }).lean();
  assert.equal(moves.length, 1);
  assert.equal(moves[0].quantityChanged, -2);
  assert.equal((await InventoryItem.findById(itemId))!.currentStock, 98);
});

test('lines added after the kitchen took the order on are stocked once, by the amend', async () => {
  const itemId = await trackStockOfB();
  const o = await place([{ productId: productA, quantity: 1 }]);
  assert.equal((await setStatus(o.id, 'PREPARING')).status, 200);
  assert.equal((await addItems(o.id, o.pass, [{ productId: productB, quantity: 3 }])).status, 200);
  assert.equal((await setStatus(o.id, 'READY')).status, 200);
  assert.equal((await setStatus(o.id, 'COMPLETED')).status, 200);
  const moves = await InventoryTransaction.find({ inventoryItemId: itemId, referenceOrderId: o.id }).lean();
  assert.equal(moves.length, 1);
  assert.equal(moves[0].quantityChanged, -3);
  const final = (await Order.findById(o.id).lean())!;
  const payments = await FinancialLedger.find({ orderId: o.id, type: 'ORDER_PAYMENT' }).lean();
  assert.equal(payments.length, 1);
  assert.equal(payments[0].amountPaise, final.totalAmountPaise);
});

test('a status change racing another status change re-reads the order instead of overwriting it', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  // Someone else cancels it between this request's load and write: COMPLETED must not win.
  statusChangeTestHooks.beforeWrite = async (orderId) => {
    statusChangeTestHooks.beforeWrite = undefined;
    await Order.updateOne({ _id: orderId }, { orderStatus: 'CANCELLED' });
  };
  const res = await setStatus(o.id, 'COMPLETED');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'ORDER_FINISHED');
  const final = (await Order.findById(o.id).lean())!;
  assert.equal(final.orderStatus, 'CANCELLED');
  assert.equal(final.paymentStatus, 'UNPAID');
  assert.equal(await FinancialLedger.countDocuments({ orderId: o.id }), 0);
});

test('the bulk status path shares the atomic transition', async () => {
  const o = await place([{ productId: productA, quantity: 1 }]);
  statusChangeTestHooks.beforeWrite = async () => {
    statusChangeTestHooks.beforeWrite = undefined;
    assert.equal((await addItems(o.id, o.pass, [{ productId: productB, quantity: 1 }])).status, 200);
  };
  const res = await request(h.app)
    .put('/api/v1/orders/bulk-status')
    .set('Authorization', `Bearer ${await kitchen()}`)
    .send({ orderIds: [o.id], status: 'COMPLETED' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.updated.length, 1);
  const final = (await Order.findById(o.id).lean())!;
  const payments = await FinancialLedger.find({ orderId: o.id, type: 'ORDER_PAYMENT' }).lean();
  assert.equal(payments[0].amountPaise, final.totalAmountPaise);
  assert.equal(final.items.length, 2);
});
