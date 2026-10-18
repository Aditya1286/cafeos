// Café identity, Task 10: the mascot's category tips come from real sales only (§8.3), fall back to
// the café's house special, and never name a dish that is unavailable or archived.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, businessIdFor, createOrderPlacer, Harness } from './helpers';
import { Business } from '../src/models/Business';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { clearCategoryTipCache } from '../src/services/menuTips.service';

let h: Harness;
let artisanId: string;
let cafeName: string;
let catId: string;
let emptyCatId: string;
let a: string;
let b: string;
let special: string;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  await Business.updateOne({ _id: artisanId }, { identity: { enabled: true } });
  cafeName = (await Business.findById(artisanId))!.name;
  const cat = await Category.create({ businessId: artisanId, name: 'Snacks Tips' });
  const empty = await Category.create({ businessId: artisanId, name: 'Desserts Tips' });
  catId = cat._id.toString();
  emptyCatId = empty._id.toString();
  const [pa, pb, ph] = await Product.insertMany([
    { businessId: artisanId, categoryId: catId, name: 'Peri Peri Fries', pricePaise: 12000 },
    { businessId: artisanId, categoryId: catId, name: 'Bun Maska', pricePaise: 6000 },
    { businessId: artisanId, categoryId: emptyCatId, name: 'Kulfi Special', pricePaise: 9000, isHouseSpecial: true }
  ]);
  a = pa._id.toString();
  b = pb._id.toString();
  special = ph._id.toString();
  placeOrder = await createOrderPlacer(h.app, 'tips');
});
after(async () => {
  await h.stop();
});
beforeEach(async () => {
  await Order.deleteMany({ businessId: artisanId });
  await Product.updateMany({ _id: { $in: [a, b, special] } }, { isAvailable: true, isDeleted: false });
  clearCategoryTipCache();
});

const menu = async () => {
  const res = await request(h.app).get(`/api/v1/public/c/${artisanId}/menu`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data;
};
const orderTimes = async (productId: string, n: number) => {
  const placed = [];
  for (let i = 0; i < n; i++) placed.push(await placeOrder('CASH', productId));
  return placed;
};

test('6 orders of a dish make it its category’s best seller', async () => {
  await orderTimes(a, 6);
  const tip = (await menu()).categoryTips[catId];
  assert.equal(tip.kind, 'best-seller');
  assert.equal(tip.productId, a);
  assert.ok(tip.line.includes('Peri Peri Fries'), tip.line);
});

test('4 orders are not enough for a best seller', async () => {
  await orderTimes(a, 4);
  assert.equal((await menu()).categoryTips[catId], undefined);
});

test('cancelled orders do not count', async () => {
  const placed = await orderTimes(a, 6);
  await Order.updateMany({ _id: { $in: placed.slice(0, 2).map((o) => o._id) } }, { orderStatus: 'CANCELLED' });
  assert.equal((await menu()).categoryTips[catId], undefined);
});

test('unavailable best seller is skipped', async () => {
  await orderTimes(a, 7);
  await orderTimes(b, 5);
  assert.equal((await menu()).categoryTips[catId].productId, a);
  // Cached ranking, fresh availability: switching A off moves the tip to B at once.
  await Product.updateOne({ _id: a }, { isAvailable: false });
  const tip = (await menu()).categoryTips[catId];
  assert.equal(tip.productId, b);
  assert.ok(!tip.line.includes('Peri Peri Fries'));
  // Archived B too: nothing qualifies, and the category has no house special.
  await Product.updateOne({ _id: b }, { isDeleted: true });
  assert.equal((await menu()).categoryTips[catId], undefined);
});

test('a house special fills a category with no best seller, never as "most ordered"', async () => {
  const data = await menu();
  const tip = data.categoryTips[emptyCatId];
  assert.equal(tip.kind, 'house-special');
  assert.equal(tip.productId, special);
  assert.doesNotMatch(tip.line, /most/i);
  assert.ok(data.houseSpecialIds.includes(special));
  assert.ok(data.firstVisitLine.includes(cafeName), data.firstVisitLine);

  await Product.updateOne({ _id: special }, { isDeleted: true });
  const after = await menu();
  assert.equal(after.categoryTips[emptyCatId], undefined);
  assert.ok(!after.houseSpecialIds.includes(special));
});

test('gate off: the menu payload has no identity extras', async () => {
  await orderTimes(a, 6);
  await Business.updateOne({ _id: artisanId }, { 'identity.enabled': false });
  try {
    const data = await menu();
    assert.equal('categoryTips' in data, false);
    assert.equal('houseSpecialIds' in data, false);
    assert.equal('firstVisitLine' in data, false);
    assert.ok(Array.isArray(data.products));
  } finally {
    await Business.updateOne({ _id: artisanId }, { 'identity.enabled': true });
  }
});

test('a category with no best seller or special names its clearly cheapest dish', async () => {
  const cat = await Category.create({ businessId: artisanId, name: 'Sides Tips' });
  const [cheap] = await Product.insertMany([
    { businessId: artisanId, categoryId: cat._id, name: 'Plain Toast', pricePaise: 4000 },
    { businessId: artisanId, categoryId: cat._id, name: 'Butter Toast', pricePaise: 6000 },
    { businessId: artisanId, categoryId: cat._id, name: 'Garlic Toast', pricePaise: 8000 }
  ]);
  const tip = (await menu()).categoryTips[cat._id.toString()];
  assert.equal(tip.kind, 'value');
  assert.equal(tip.productId, cheap._id.toString());
  assert.ok(tip.line.includes('₹40'), tip.line);
  assert.doesNotMatch(tip.line, /most|popular|best/i);
  // Two dishes tied for cheapest: no single cheapest to name.
  await Product.updateOne({ _id: cheap._id }, { pricePaise: 6000 });
  assert.equal((await menu()).categoryTips[cat._id.toString()], undefined);
});

test('a best seller is described from more than one true angle, never with a made-up figure', async () => {
  await orderTimes(a, 8);
  const lines = new Set<string>();
  const realNow = Date.now;
  try {
    for (let d = 0; d < 3; d++) {
      Date.now = () => realNow() + d * 24 * 60 * 60 * 1000;
      lines.add((await menu()).categoryTips[catId].line);
    }
  } finally {
    Date.now = realNow;
  }
  assert.ok(lines.size > 1, [...lines].join(' | '));
  for (const line of lines) {
    assert.ok(line.includes('Peri Peri Fries'), line);
    for (const n of line.match(/\d+/g) ?? []) assert.equal(n, '8', line);
  }
});
