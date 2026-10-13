// The Kitchen metrics: median and p90 times from the order timeline, late orders against each
// product's prep target, and orders per hour. Cancelled orders are not the kitchen's work.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { businessIdFor } from './helpers';
import { seedOrders, clearSeededOrders, startAnalyticsHarness, AnalyticsHarness } from './analyticsFixtures';
import { Category } from '../src/models/Category';
import { Product } from '../src/models/Product';
import { kitchenOrders } from '../src/dao/analyticsKitchen.dao';
import { percentile } from '../src/services/analytics/metrics/kitchen';

let A: AnalyticsHarness;
const id: Record<string, string> = {};

before(async () => {
  A = await startAnalyticsHarness();
  const businessId = new mongoose.Types.ObjectId(await businessIdFor('artisan-cafe'));
  const category = await Category.create({ businessId, name: 'Kitchen Test' });
  for (const [name, minutes] of [['Quick Shot', 5], ['Slow Stew', 30], ['Regular Plate', 15]] as const) {
    id[name] = String((await Product.create({ businessId, categoryId: category._id, name, pricePaise: 1_000, imageUrl: '', preparationTimeMinutes: minutes }))._id);
  }
});
after(async () => {
  await A.stop();
});
beforeEach(async () => {
  await clearSeededOrders();
});

const item = (product: string) => [{ productId: id[product], name: product, pricePaise: 1_000 }];

/** Seeded on 10 March 2025 (India time). Durations in seconds are in the comments. */
const seedKitchenDay = () =>
  seedOrders([
    // accept 60, prep 600, fulfil 1200; Quick Shot is meant to take 5 min: late
    { at: '2025-03-10T04:00:00Z', items: item('Quick Shot'), timeline: { preparingAt: '2025-03-10T04:01:00Z', readyAt: '2025-03-10T04:11:00Z', completedAt: '2025-03-10T04:20:00Z' } },
    // accept 120, prep 900, fulfil 1800; Slow Stew is meant to take 30 min: on time
    { at: '2025-03-10T05:00:00Z', items: item('Slow Stew'), timeline: { preparingAt: '2025-03-10T05:02:00Z', readyAt: '2025-03-10T05:17:00Z', completedAt: '2025-03-10T05:30:00Z' } },
    // accept 30, prep 180, fulfil 600: on time
    { at: '2025-03-10T06:00:00Z', items: item('Quick Shot'), timeline: { preparingAt: '2025-03-10T06:00:30Z', readyAt: '2025-03-10T06:03:30Z', completedAt: '2025-03-10T06:10:00Z' } },
    // an old order that only has acceptedAt: accept 180, prep 600, never completed; late
    { at: '2025-03-10T07:00:00Z', items: item('Quick Shot'), timeline: { acceptedAt: '2025-03-10T07:03:00Z', readyAt: '2025-03-10T07:13:00Z' } },
    // unpaid but the kitchen worked on it: accept 60, prep 240, fulfil 360; Regular Plate has 15 min: on time
    { at: '2025-03-10T08:00:00Z', items: item('Regular Plate'), paymentStatus: 'UNPAID', timeline: { preparingAt: '2025-03-10T08:01:00Z', readyAt: '2025-03-10T08:05:00Z', completedAt: '2025-03-10T08:06:00Z' } },
    // still waiting: no readings yet
    { at: '2025-03-10T09:00:00Z', items: item('Quick Shot'), orderStatus: 'PLACED' },
    // cancelled: not the kitchen's work
    { at: '2025-03-10T04:30:00Z', items: item('Quick Shot'), orderStatus: 'CANCELLED', timeline: { preparingAt: '2025-03-10T04:31:00Z', readyAt: '2025-03-10T09:31:00Z' } },
  ]);

test('percentiles use the nearest rank and cope with tiny lists', () => {
  assert.equal(percentile([], 50), null);
  assert.equal(percentile([7], 50), 7);
  assert.equal(percentile([7], 90), 7);
  assert.equal(percentile([30, 60, 60, 120, 180], 50), 60);
  assert.equal(percentile([30, 60, 60, 120, 180], 90), 180);
  assert.equal(percentile([360, 600, 1200, 1800], 50), 600);
  assert.equal(percentile([180, 240, 600, 600, 900], 90), 900);
  assert.equal(percentile([5, 1, 3], 50), 3, 'unsorted input is fine');
});

test('median and p90 prep time, median fulfilment, and the late-order rate', async () => {
  await seedKitchenDay();
  const r = async (metric: string) => A.metric(metric);
  const median = await r('kpi.prep_median');
  assert.deepEqual([median.kind, median.unit, median.value], ['kpi', 'seconds', 600]); // 180, 240, 600, 600, 900
  assert.equal((await r('kpi.prep_p90')).value, 900);
  assert.equal((await r('kpi.fulfil_median')).value, 600); // 360, 600, 1200, 1800 (the unfinished order has none)
  const late = await r('kpi.late_rate');
  assert.deepEqual([late.unit, late.value], ['percent', 40]); // 2 of the 5 orders with a prep time
});

test('one order left open for hours moves the p90 but not the median', async () => {
  await seedKitchenDay();
  await seedOrders([{ at: '2025-03-10T10:00:00Z', items: item('Regular Plate'), timeline: { preparingAt: '2025-03-10T10:01:00Z', readyAt: '2025-03-10T16:01:00Z' } }]); // six hours
  assert.equal((await A.metric('kpi.prep_median')).value, 600);
  assert.equal((await A.metric('kpi.prep_p90')).value, 21_600);
});

test('against the previous period', async () => {
  await seedKitchenDay();
  await seedOrders([{ at: '2025-03-09T06:00:00Z', items: item('Regular Plate'), timeline: { preparingAt: '2025-03-09T06:01:00Z', readyAt: '2025-03-09T06:06:00Z' } }]); // prep 300
  const data = await A.metric('kpi.prep_median', { compare: 'previous_period' });
  assert.deepEqual([data.value, data.previous, data.changePct], [600, 300, 100]);
});

test('kitchen times through the day: a median per hour, and a gap (null) where there is no reading', async () => {
  await seedKitchenDay();
  const data = await A.metric('ts.kitchen_times');
  assert.equal(data.kind, 'series');
  assert.equal(data.buckets.length, 24);
  const [accept, prep] = data.series;
  assert.deepEqual([accept.id, accept.unit, prep.id, prep.unit], ['accept', 'seconds', 'prep', 'seconds']);
  // 04:00Z = 09:30 IST → hour 9, and so on
  assert.deepEqual([9, 10, 11, 12, 13].map((h) => accept.points[h]), [60, 120, 30, 180, 60]);
  assert.deepEqual([9, 10, 11, 12, 13].map((h) => prep.points[h]), [600, 900, 180, 600, 240]);
  assert.equal(accept.points[0], null);
  assert.equal(prep.points[14], null, 'the waiting order has no prep time yet');
});

test('orders per hour of the day, averaged over the days in the period', async () => {
  await seedKitchenDay();
  const one = await A.metric('ts.throughput_by_hour');
  assert.equal(one.buckets.length, 24);
  assert.equal(one.buckets[9].key, '09');
  assert.equal(one.buckets[9].label, '9am');
  const orders = one.series[0];
  assert.deepEqual([orders.id, orders.unit], ['orders', 'count']);
  assert.deepEqual([9, 10, 11, 12, 13, 14].map((h) => orders.points[h]), [1, 1, 1, 1, 1, 1]); // the cancelled order is not counted
  assert.equal(orders.points.reduce((a: number, b: number) => a + b, 0), 6);
  const twoDays = await A.metric('ts.throughput_by_hour', { range: { from: '2025-03-09', to: '2025-03-10' } });
  assert.equal(twoDays.series[0].points[9], 0.5, 'one order over two days is half an order a day');
});

test('the kitchen honours order slices but not item filters, and says so', async () => {
  await seedOrders([
    { at: '2025-03-10T04:00:00Z', items: item('Quick Shot'), source: 'TAKEAWAY', timeline: { preparingAt: '2025-03-10T04:01:00Z', readyAt: '2025-03-10T04:11:00Z' } }, // prep 600
    { at: '2025-03-10T05:00:00Z', items: item('Quick Shot'), source: 'QR_TABLE', timeline: { preparingAt: '2025-03-10T05:01:00Z', readyAt: '2025-03-10T05:02:00Z' } }, // prep 60
  ]);
  assert.equal((await A.metric('kpi.prep_median', { source: ['TAKEAWAY'] })).value, 600);
  assert.equal((await A.metric('kpi.prep_median', { source: ['QR_TABLE'] })).value, 60);
  const res = await A.query(A.owner, ['kpi.prep_median'], { veg: 'veg', categoryIds: [id['Quick Shot']] });
  assert.deepEqual(res.body.results['kpi.prep_median'].data.notApplied, ['category', 'veg']);
  assert.equal(res.body.results['kpi.prep_median'].data.value, 60, 'unfiltered: the median of 600 and 60 by nearest rank');
});

test('no orders, no readings: nulls and zeros, not errors', async () => {
  const range = { range: { from: '2020-01-01', to: '2020-01-01' } };
  for (const metric of ['kpi.prep_median', 'kpi.prep_p90', 'kpi.fulfil_median', 'kpi.late_rate']) {
    assert.equal((await A.metric(metric, range)).value, null, metric);
  }
  const times = await A.metric('ts.kitchen_times', range);
  assert.ok(times.series.every((s: any) => s.points.every((p: number | null) => p === null)));
  assert.ok((await A.metric('ts.throughput_by_hour', range)).series[0].points.every((p: number) => p === 0));
});

test('a huge range reads only a capped, newest-first sample and says so', async () => {
  await seedKitchenDay();
  const businessId = new mongoose.Types.ObjectId(await businessIdFor('artisan-cafe'));
  const scope = {
    businessId,
    timezone: 'Asia/Kolkata',
    start: new Date('2025-03-09T18:30:00Z'),
    end: new Date('2025-03-10T18:30:00Z'),
    payment: 'any' as const,
    excludeCancelled: true,
    sources: [],
    paymentMethods: [],
    hours: null,
    productIds: null,
  };
  const capped = await kitchenOrders(scope, 3);
  assert.equal(capped.sampled, true);
  assert.equal(capped.rows.length, 3);
  assert.deepEqual(capped.rows.map((r) => r.createdAt.toISOString()), ['2025-03-10T09:00:00.000Z', '2025-03-10T08:00:00.000Z', '2025-03-10T07:00:00.000Z']); // the newest three
  const all = await kitchenOrders(scope);
  assert.equal(all.sampled, false);
  assert.equal(all.rows.length, 6);
});
