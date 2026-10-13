// POST /analytics/query: access control, validation, per-metric isolation, tenant isolation, and
// the first metrics end to end (the Overview KPIs). Orders are seeded on fixed past dates so the
// demo seed's own recent orders never mix in.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { superAdminToken, businessIdFor, firstProductIdFor } from './helpers';
import { seedOrders, clearSeededOrders, startAnalyticsHarness, AnalyticsHarness } from './analyticsFixtures';
import { registerMetric } from '../src/services/analytics/registry';

let A: AnalyticsHarness;
let owner: string;
let beanOwner: string;
let query: AnalyticsHarness['query'];

before(async () => {
  A = await startAnalyticsHarness();
  ({ owner, beanOwner, query } = A);
});
after(async () => {
  await A.stop();
});
beforeEach(async () => {
  await clearSeededOrders();
});

// ── access and validation ────────────────────────────────────────────────────────────────────────
test('needs a login', async () => {
  const res = await request(A.h.app).post('/api/v1/analytics/query').send({ metrics: ['kpi.net_sales'] });
  assert.equal(res.status, 401);
});

test('kitchen staff cannot read analytics', async () => {
  const created = await request(A.h.app).post('/api/v1/staff').set('Authorization', `Bearer ${owner}`).send({ name: 'Kitchen Kim', email: 'kim.analytics@artisan.com', password: 'kitchen-pass-1' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const login = await request(A.h.app).post('/api/v1/auth/login').send({ email: 'kim.analytics@artisan.com', password: 'kitchen-pass-1' });
  const res = await query(login.body.data.token, ['kpi.net_sales']);
  assert.equal(res.status, 403);
});

test('bad input is a 400 in the standard error shape', async () => {
  const bad = await request(A.h.app).post('/api/v1/analytics/query').set('Authorization', `Bearer ${owner}`).send({ metrics: [], filters: {} });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.success, false);
  assert.equal(bad.body.error.code, 'INVALID_INPUT');
  const operators = await request(A.h.app).post('/api/v1/analytics/query').set('Authorization', `Bearer ${owner}`).send({ metrics: ['kpi.net_sales'], filters: { source: { $ne: null } } });
  assert.equal(operators.status, 400);
  const hourly = await query(owner, ['kpi.net_sales'], { range: { preset: 'last30' }, granularity: 'hour' });
  assert.equal(hourly.status, 400, 'hourly detail over 30 days is refused');
});

test('a super admin names the business with x-business-id; without it the request is refused', async () => {
  const admin = await superAdminToken();
  const artisanId = await businessIdFor('artisan-cafe');
  await seedOrders([{ at: '2025-03-10T06:00:00Z', subtotalPaise: 12_300 }]);
  const ok = await query(admin, ['kpi.net_sales'], {}, { 'x-business-id': artisanId });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.results['kpi.net_sales'].data.value, 12_300);
  const missing = await query(admin, ['kpi.net_sales']);
  assert.equal(missing.status, 400);
  assert.equal(missing.body.error.code, 'BUSINESS_REQUIRED');
  const garbage = await query(admin, ['kpi.net_sales'], {}, { 'x-business-id': 'not-an-id' });
  assert.equal(garbage.status, 400);
});

test('the response says which window and bucket size it used', async () => {
  const res = await query(owner, ['kpi.net_sales'], { compare: 'previous_period' });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.meta.timezone, 'Asia/Kolkata');
  assert.equal(res.body.meta.range.start, '2025-03-09T18:30:00.000Z');
  assert.equal(res.body.meta.range.end, '2025-03-10T18:30:00.000Z');
  assert.equal(res.body.meta.compareRange.start, '2025-03-08T18:30:00.000Z');
  assert.equal(res.body.meta.compareRange.end, '2025-03-09T18:30:00.000Z');
  assert.equal(res.body.meta.granularity, 'hour');
  const none = await query(owner, ['kpi.net_sales']);
  assert.equal(none.body.meta.compareRange, null);
});

// ── isolation of metrics from each other ─────────────────────────────────────────────────────────
test('an unknown metric id is reported on its own; the others still come back', async () => {
  const res = await query(owner, ['kpi.net_sales', 'kpi.does_not_exist']);
  assert.equal(res.status, 200);
  assert.equal(res.body.results['kpi.net_sales'].ok, true);
  assert.equal(res.body.results['kpi.does_not_exist'].ok, false);
  assert.equal(res.body.results['kpi.does_not_exist'].error.code, 'UNKNOWN_METRIC');
});

test('a metric that throws fails alone, and its internals are not leaked', async () => {
  registerMetric({
    id: 'test.throws',
    appliesSlices: true,
    appliesItemFilters: true,
    async compute() {
      throw new Error('secret internals: mongodb://user:pass@host');
    },
  });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await query(owner, ['kpi.net_sales', 'test.throws']);
    assert.equal(res.status, 200);
    assert.equal(res.body.results['kpi.net_sales'].ok, true);
    assert.equal(res.body.results['test.throws'].ok, false);
    assert.equal(res.body.results['test.throws'].error.code, 'METRIC_FAILED');
    assert.equal(JSON.stringify(res.body).includes('secret internals'), false);
  } finally {
    console.error = original;
  }
});

test('asking for the same metric twice computes it once and returns it once', async () => {
  let calls = 0;
  registerMetric({
    id: 'test.counting',
    appliesSlices: true,
    appliesItemFilters: true,
    async compute() {
      calls += 1;
      return { kind: 'kpi', unit: 'count', value: 1, previous: null, changePct: null };
    },
  });
  const res = await query(owner, ['test.counting', 'test.counting']);
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(res.body.results), ['test.counting']);
});

test('a metric that ignores slices says so, and never shares a cached query with one that honours them', async () => {
  registerMetric({
    id: 'test.honours',
    appliesSlices: true,
    appliesItemFilters: true,
    async compute(ctx) {
      const sliced = await ctx.memo('shared-key', async () => ctx.apply.slices);
      return { kind: 'kpi', unit: 'count', value: sliced ? 1 : 0, previous: null, changePct: null };
    },
  });
  registerMetric({
    id: 'test.ignores',
    appliesSlices: false,
    appliesItemFilters: false,
    async compute(ctx) {
      const sliced = await ctx.memo('shared-key', async () => ctx.apply.slices);
      return { kind: 'kpi', unit: 'count', value: sliced ? 1 : 0, previous: null, changePct: null };
    },
  });
  const res = await query(owner, ['test.honours', 'test.ignores'], { source: ['QR_TABLE'], categoryIds: ['a'.repeat(24)], veg: 'veg' });
  assert.equal(res.body.results['test.honours'].data.value, 1);
  assert.equal(res.body.results['test.ignores'].data.value, 0, 'the caches are kept apart');
  assert.equal(res.body.results['test.honours'].data.notApplied, undefined);
  assert.deepEqual(res.body.results['test.ignores'].data.notApplied, ['source', 'category', 'veg']);
});

// ── the Overview KPIs ────────────────────────────────────────────────────────────────────────────
test('net sales, orders, average ticket and items per order count revenue orders only, ex-GST', async () => {
  const artisanProduct = await firstProductIdFor('artisan-cafe');
  await seedOrders([
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 20_000, taxPaise: 1_000 }, // 20000 net; GST is not sales
    {
      at: '2025-03-10T06:00:00Z',
      items: [
        { productId: artisanProduct, pricePaise: 5_000, quantity: 2 }, // 10000
        { productId: artisanProduct, pricePaise: 3_000, quantity: 1, addons: [{ name: 'Shot', pricePaise: 500 }] }, // 3500
      ],
      discountPaise: 500, // 13500 - 500 = 13000, 3 units
    },
    { at: '2025-03-10T08:00:00Z', subtotalPaise: 7_000, omit: ['discountPaise'] }, // an old order with no discount field
    // none of these are revenue:
    { at: '2025-03-10T05:00:00Z', subtotalPaise: 50_000, paymentStatus: 'UNPAID' },
    { at: '2025-03-10T05:10:00Z', subtotalPaise: 50_000, orderStatus: 'CANCELLED', paymentStatus: 'PAID' }, // paid, then cancelled: refund pending
    { at: '2025-03-10T05:20:00Z', subtotalPaise: 50_000, orderStatus: 'REFUNDED', paymentStatus: 'REFUNDED' },
    { at: '2025-03-10T05:30:00Z', subtotalPaise: 50_000, paymentStatus: 'FAILED' },
    { at: '2025-03-10T05:40:00Z', subtotalPaise: 50_000, business: 'bean-and-butter' }, // someone else's café
    { at: '2025-03-10T19:00:00Z', subtotalPaise: 50_000 }, // 00:30 IST on the 11th
    { at: '2025-03-09T18:29:00Z', subtotalPaise: 50_000 }, // 23:59 IST on the 9th
  ]);
  const res = await query(owner, ['kpi.net_sales', 'kpi.orders', 'kpi.avg_ticket', 'kpi.items_per_order']);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const r = res.body.results;
  assert.equal(r['kpi.net_sales'].data.value, 40_000);
  assert.equal(r['kpi.net_sales'].data.unit, 'paise');
  assert.equal(r['kpi.orders'].data.value, 3);
  assert.equal(r['kpi.avg_ticket'].data.value, 13_333);
  assert.equal(r['kpi.items_per_order'].data.value, 1.7);
  // every revenue order falls in one of the hourly buckets, so the sparkline adds back up
  const spark: number[] = r['kpi.net_sales'].data.sparkline;
  assert.equal(spark.length, 24);
  assert.equal(spark.reduce((a, b) => a + b, 0), 40_000);
});

test('compared with the previous period: the other figure and the percent change', async () => {
  await seedOrders([
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 30_000 },
    { at: '2025-03-09T06:00:00Z', subtotalPaise: 20_000 }, // the day before
    { at: '2025-03-09T07:00:00Z', subtotalPaise: 20_000 },
  ]);
  const res = await query(owner, ['kpi.net_sales', 'kpi.orders', 'kpi.avg_ticket'], { compare: 'previous_period' });
  const r = res.body.results;
  assert.deepEqual([r['kpi.net_sales'].data.value, r['kpi.net_sales'].data.previous, r['kpi.net_sales'].data.changePct], [30_000, 40_000, -25]);
  assert.deepEqual([r['kpi.orders'].data.value, r['kpi.orders'].data.previous, r['kpi.orders'].data.changePct], [1, 2, -50]);
  assert.deepEqual([r['kpi.avg_ticket'].data.value, r['kpi.avg_ticket'].data.previous, r['kpi.avg_ticket'].data.changePct], [30_000, 20_000, 50]);
});

test('with nothing to compare with, the change is null, never infinity or NaN', async () => {
  await seedOrders([{ at: '2025-03-10T06:00:00Z', subtotalPaise: 30_000 }]);
  const res = await query(owner, ['kpi.net_sales'], { compare: 'previous_period' });
  const data = res.body.results['kpi.net_sales'].data;
  assert.equal(data.previous, 0);
  assert.equal(data.changePct, null);
});

test('an empty period gives zeros and nulls, not errors', async () => {
  const res = await query(owner, ['kpi.net_sales', 'kpi.orders', 'kpi.avg_ticket', 'kpi.items_per_order'], { range: { from: '2020-01-01', to: '2020-01-02' }, compare: 'previous_period' });
  assert.equal(res.status, 200);
  const r = res.body.results;
  assert.equal(r['kpi.net_sales'].data.value, 0);
  assert.equal(r['kpi.orders'].data.value, 0);
  assert.equal(r['kpi.avg_ticket'].data.value, null);
  assert.equal(r['kpi.items_per_order'].data.value, null);
  assert.equal(r['kpi.net_sales'].data.changePct, null);
});

test('each café sees only its own numbers', async () => {
  await seedOrders([
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 11_100 },
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 99_900, business: 'bean-and-butter' },
  ]);
  const mine = await query(owner, ['kpi.net_sales', 'kpi.orders']);
  const theirs = await query(beanOwner, ['kpi.net_sales', 'kpi.orders']);
  assert.equal(mine.body.results['kpi.net_sales'].data.value, 11_100);
  assert.equal(theirs.body.results['kpi.net_sales'].data.value, 99_900);
  assert.equal(mine.body.results['kpi.orders'].data.value, 1);
});

test('order-level slices narrow the totals; unknown values never reach the database', async () => {
  await seedOrders([
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 10_000, source: 'QR_TABLE', paymentMethod: 'CASH' },
    { at: '2025-03-10T06:10:00Z', subtotalPaise: 20_000, source: 'TAKEAWAY', paymentMethod: 'ONLINE' },
    { at: '2025-03-10T06:20:00Z', subtotalPaise: 40_000, source: 'TAKEAWAY', paymentMethod: 'CASH' },
  ]);
  const get = async (filters: Record<string, unknown>) => (await query(owner, ['kpi.net_sales'], filters)).body.results['kpi.net_sales'].data.value;
  assert.equal(await get({}), 70_000);
  assert.equal(await get({ source: ['TAKEAWAY'] }), 60_000);
  assert.equal(await get({ paymentMethod: ['CASH'] }), 50_000);
  assert.equal(await get({ source: ['TAKEAWAY'], paymentMethod: ['CASH'] }), 40_000);
  assert.equal(await get({ source: ['QR_TABLE', 'TAKEAWAY'] }), 70_000);
});

test('the daypart slice uses the café’s local hours', async () => {
  await seedOrders([
    { at: '2025-03-10T03:30:00Z', subtotalPaise: 1_000 }, // 09:00 IST: morning
    { at: '2025-03-10T08:30:00Z', subtotalPaise: 2_000 }, // 14:00 IST: afternoon
    { at: '2025-03-10T13:30:00Z', subtotalPaise: 4_000 }, // 19:00 IST: evening
    { at: '2025-03-09T20:00:00Z', subtotalPaise: 8_000 }, // 01:30 IST on the 10th: night
  ]);
  const get = async (daypart: string[]) => (await query(owner, ['kpi.net_sales'], { daypart })).body.results['kpi.net_sales'].data.value;
  assert.equal(await get(['morning']), 1_000);
  assert.equal(await get(['afternoon']), 2_000);
  assert.equal(await get(['evening']), 4_000);
  assert.equal(await get(['night']), 8_000);
  assert.equal(await get(['morning', 'night']), 9_000);
});
