// The public menu's "Popular" tags must reflect real sales only: enough separate orders in the
// window, cancelled/refunded orders excluded, capped, best seller first.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, businessIdFor, createOrderPlacer, Harness } from './helpers';
import { Product } from '../src/models/Product';
import { Order } from '../src/models/Order';
import { clearPopularityCache, POPULAR_MIN_ORDERS, POPULAR_MAX_ITEMS } from '../src/services/menuPopularity.service';

let h: Harness;
let artisanId: string;
let productIds: string[];
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;

before(async () => {
  h = await startHarness();
  artisanId = await businessIdFor('artisan-cafe');
  // Enough distinct products to test the cap.
  const base = await Product.findOne({ businessId: artisanId });
  const extra = await Product.insertMany(
    Array.from({ length: POPULAR_MAX_ITEMS + 1 }, (_, i) => ({
      businessId: artisanId,
      categoryId: base!.categoryId,
      name: `Popularity Test ${i}`,
      pricePaise: 10000
    }))
  );
  productIds = extra.map((p) => p._id.toString());
  placeOrder = await createOrderPlacer(h.app, 'popular');
});
after(async () => {
  await h.stop();
});
beforeEach(async () => {
  await Order.deleteMany({ businessId: artisanId });
  clearPopularityCache();
});

const popularIds = async (): Promise<string[]> => {
  const res = await request(h.app).get(`/api/v1/public/c/${artisanId}/menu`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data.popularProductIds;
};

const orderTimes = async (productId: string, n: number) => {
  for (let i = 0; i < n; i++) await placeOrder('CASH', productId);
};

test('a café with little history shows no popular items at all', async () => {
  await orderTimes(productIds[0], POPULAR_MIN_ORDERS - 1);
  assert.deepEqual(await popularIds(), []);
});

test('an item ordered often enough becomes popular; a rarely ordered one does not', async () => {
  await orderTimes(productIds[0], POPULAR_MIN_ORDERS);
  await orderTimes(productIds[1], 2);
  assert.deepEqual(await popularIds(), [productIds[0]]);
});

test('best sellers come first and the list is capped', async () => {
  for (let i = 0; i <= POPULAR_MAX_ITEMS; i++) {
    await orderTimes(productIds[i], POPULAR_MIN_ORDERS + i); // later products sell more
  }
  const ids = await popularIds();
  assert.equal(ids.length, POPULAR_MAX_ITEMS);
  assert.equal(ids[0], productIds[POPULAR_MAX_ITEMS]);
  assert.ok(!ids.includes(productIds[0]), 'the weakest seller should fall off the capped list');
});

test('cancelled and refunded orders do not count', async () => {
  await orderTimes(productIds[2], POPULAR_MIN_ORDERS);
  await Order.updateMany({ businessId: artisanId }, { orderStatus: 'CANCELLED' });
  assert.deepEqual(await popularIds(), []);
});

test('orders older than the window do not count', async () => {
  await orderTimes(productIds[3], POPULAR_MIN_ORDERS);
  // Straight to the collection: Mongoose treats createdAt as immutable and would drop the change.
  await Order.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } });
  assert.deepEqual(await popularIds(), []);
});

test('a malformed business id is a clean 404, not a 500', async () => {
  const res = await request(h.app).get('/api/v1/public/c/not-an-id/menu');
  assert.equal(res.status, 404);
});
