// Stars and a quick review after an order: only once it is served, once per order, only with
// reasons that fit the rating, and the café can read them back with the numbers.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { startHarness, tokenFor, createOrderPlacer, Harness } from './helpers';
import reviewRoutes from '../src/routes/reviewRoutes';
import { Order } from '../src/models/Order';
import { OrderReview } from '../src/models/OrderReview';
import { REVIEW_TAGS } from '../src/constants/reviewTags';

let h: Harness;
let placeOrder: Awaited<ReturnType<typeof createOrderPlacer>>;
let owner: string;
const as = (token: string) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  h = await startHarness();
  h.app.use('/api/v1/reviews', reviewRoutes);
  placeOrder = await createOrderPlacer(h.app, 'review');
  owner = await tokenFor('owner@artisan.com');
});
after(async () => {
  await h.stop();
});

const served = async (status = 'SERVED') => {
  const order = await placeOrder('CASH');
  await Order.updateOne({ _id: order._id }, { orderStatus: status });
  return order._id;
};
const review = (id: string, body: object) => request(h.app).post(`/api/v1/public/orders/${id}/review`).send(body);
const state = async (id: string) => (await request(h.app).get(`/api/v1/public/orders/${id}/review`)).body.data;

test('an order that has not been served cannot be reviewed yet', async () => {
  const order = await placeOrder('CASH');
  assert.equal((await state(order._id)).eligible, false);
  const res = await review(order._id, { rating: 5 });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'ORDER_NOT_REVIEWABLE');
});

test('a served order takes a review with stars, matching reasons and a comment', async () => {
  const id = await served();
  assert.equal((await state(id)).eligible, true);
  const res = await review(id, { rating: 5, tags: ['great-taste', 'quick-service'], comment: '  Loved the cortado  ' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.tags, ['great-taste', 'quick-service']);
  assert.equal(res.body.data.comment, 'Loved the cortado');

  const saved = (await OrderReview.findOne({ orderId: id }))!;
  assert.equal(saved.rating, 5);
  assert.equal(saved.customerName, 'Test Customer');
  assert.ok(saved.productIds.length >= 1, 'keeps what was in the order');
  assert.ok(saved.orderTotalPaise > 0);
});

test('afterwards the order shows its review and offers no second one', async () => {
  const id = await served('COMPLETED');
  await review(id, { rating: 4 });
  const after = await state(id);
  assert.equal(after.eligible, false);
  assert.equal(after.review.rating, 4);
  const again = await review(id, { rating: 1 });
  assert.equal(again.status, 409);
  assert.equal(again.body.error.code, 'ALREADY_REVIEWED');
  assert.equal(await OrderReview.countDocuments({ orderId: id }), 1);
});

test('two taps at once leave one review', async () => {
  const id = await served();
  const results = await Promise.all([review(id, { rating: 5 }), review(id, { rating: 5 })]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(await OrderReview.countDocuments({ orderId: id }), 1);
});

test('the rating, reasons and comment are checked', async () => {
  const id = await served();
  for (const body of [
    {},
    { rating: 0 },
    { rating: 6 },
    { rating: 3.5 },
    { rating: '5' },
    { rating: 5, tags: ['long-wait'] }, // a complaint under 5 stars
    { rating: 1, tags: ['great-taste'] }, // praise under 1 star
    { rating: 5, tags: ['not-a-reason'] },
    { rating: 5, tags: 'great-taste' },
    { rating: 5, tags: ['great-taste', 'fresh-and-hot', 'quick-service', 'friendly-staff', 'lovely-ambience', 'worth-the-price'] },
    { rating: 5, comment: 'x'.repeat(301) },
    { rating: 5, comment: 42 }
  ]) {
    const res = await review(id, body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(await OrderReview.countDocuments({ orderId: id }), 0);
});

test('cancelled and refunded orders cannot be reviewed', async () => {
  for (const status of ['CANCELLED', 'REFUNDED']) {
    const id = await served(status);
    assert.equal((await review(id, { rating: 5 })).status, 409);
  }
});

test('an unknown or malformed order id is a 404', async () => {
  assert.equal((await request(h.app).get('/api/v1/public/orders/nope/review')).status, 404);
  assert.equal((await review('0'.repeat(24), { rating: 5 })).status, 404);
});

test('every reason belongs to a theme and is offered for at least one rating, with unique ids', () => {
  assert.equal(new Set(REVIEW_TAGS.map((t) => t.id)).size, REVIEW_TAGS.length);
  for (let stars = 1; stars <= 5; stars++) {
    assert.ok(REVIEW_TAGS.filter((t) => t.ratings.includes(stars)).length >= 3, `${stars} stars has too few reasons`);
  }
});

test('the café reads its reviews with the average, star counts and most-ticked reasons', async () => {
  await OrderReview.deleteMany({});
  for (const [rating, tags] of [[5, ['great-taste']], [5, ['great-taste', 'quick-service']], [2, ['long-wait']]] as const) {
    await review(await served(), { rating, tags });
  }
  const res = await request(h.app).get('/api/v1/reviews').set(as(owner));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const { summary, reviews, pagination } = res.body.data;
  assert.equal(summary.count, 3);
  assert.equal(summary.average, 4);
  assert.deepEqual(summary.distribution, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 2 });
  assert.deepEqual(summary.tags[0], { id: 'great-taste', label: 'Great taste', theme: 'food', count: 2 });
  assert.equal(reviews.length, 3);
  assert.equal(pagination.total, 3);
  assert.equal((await request(h.app).get('/api/v1/reviews')).status, 401);
});

test("one café's reviews are not another's", async () => {
  const other = await tokenFor('owner@beanandbutter.com');
  const res = await request(h.app).get('/api/v1/reviews').set(as(other));
  assert.equal(res.body.data.summary.count, 0);
});
