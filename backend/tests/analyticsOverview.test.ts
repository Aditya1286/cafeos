// The Overview metrics: trend, order source / payment mix, average ticket by daypart, busy hours.
// Fixed past dates; India time (UTC+5:30). 10 March 2025 is a Monday.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedOrders, clearSeededOrders, startAnalyticsHarness, AnalyticsHarness } from './analyticsFixtures';

let A: AnalyticsHarness;
before(async () => {
  A = await startAnalyticsHarness();
});
after(async () => {
  await A.stop();
});
beforeEach(async () => {
  await clearSeededOrders();
});

const THREE_DAYS = { from: '2025-03-10', to: '2025-03-12' };

// ── ts.sales_orders ──────────────────────────────────────────────────────────────────────────────
test('trend: one zero-filled point per day, cut at the café’s own midnight', async () => {
  await seedOrders([
    { at: '2025-03-10T18:00:00Z', subtotalPaise: 1_000 }, // 23:30 IST on the 10th
    { at: '2025-03-10T19:00:00Z', subtotalPaise: 2_000 }, // 00:30 IST on the 11th (still the 10th in UTC)
    { at: '2025-03-12T06:00:00Z', subtotalPaise: 3_000 },
    { at: '2025-03-12T07:00:00Z', subtotalPaise: 5_000 },
    { at: '2025-03-12T08:00:00Z', subtotalPaise: 9_000, paymentStatus: 'UNPAID' }, // not revenue
  ]);
  const data = await A.metric('ts.sales_orders', { range: THREE_DAYS });
  assert.equal(data.kind, 'series');
  assert.deepEqual(data.buckets.map((b: any) => b.key), ['2025-03-10', '2025-03-11', '2025-03-12']);
  assert.deepEqual(data.buckets.map((b: any) => b.label), ['10 Mar', '11 Mar', '12 Mar']);
  const [sales, orders] = data.series;
  assert.deepEqual([sales.id, sales.unit, orders.id, orders.unit], ['sales', 'paise', 'orders', 'count']);
  assert.deepEqual(sales.points, [1_000, 2_000, 8_000]);
  assert.deepEqual(orders.points, [1, 1, 2]);
  assert.equal(sales.previousPoints, undefined, 'no comparison asked for');
});

test('trend: a short range is hourly, and every hour is present', async () => {
  await seedOrders([{ at: '2025-03-10T09:00:00Z', subtotalPaise: 4_000 }]); // 14:30 IST
  const data = await A.metric('ts.sales_orders');
  assert.equal(data.buckets.length, 24);
  assert.equal(data.buckets[14].key, '2025-03-10T14');
  assert.equal(data.buckets[14].label, '2pm');
  assert.equal(data.series[0].points[14], 4_000);
  assert.equal(data.series[0].points.filter((p: number) => p === 0).length, 23);
});

test('trend: the previous period is laid over the current one, bucket by bucket', async () => {
  await seedOrders([
    { at: '2025-03-07T06:00:00Z', subtotalPaise: 100 },
    { at: '2025-03-09T06:00:00Z', subtotalPaise: 300 },
    { at: '2025-03-11T06:00:00Z', subtotalPaise: 700 },
  ]);
  const data = await A.metric('ts.sales_orders', { range: THREE_DAYS, compare: 'previous_period' });
  const [sales, orders] = data.series;
  assert.deepEqual(sales.points, [0, 700, 0]);
  assert.deepEqual(sales.previousPoints, [100, 0, 300]);
  assert.deepEqual(orders.previousPoints, [1, 0, 1]);
});

test('trend: buckets that have not happened yet are null, not zero', async () => {
  const data = await A.metric('ts.sales_orders', { range: { from: '2099-01-01', to: '2099-01-03' } });
  assert.deepEqual(data.series[0].points, [null, null, null]);
  assert.deepEqual(data.series[1].points, [null, null, null]);
});

test('trend: weeks run Monday to Sunday and months roll the days up', async () => {
  await seedOrders([
    { at: '2025-03-03T06:00:00Z', subtotalPaise: 1_000 }, // Mon 3 Mar
    { at: '2025-03-31T06:00:00Z', subtotalPaise: 2_000 }, // Mon 31 Mar
    { at: '2025-04-01T06:00:00Z', subtotalPaise: 4_000 },
  ]);
  const range = { from: '2025-03-01', to: '2025-04-30' };
  const weekly = await A.metric('ts.sales_orders', { range, granularity: 'week' });
  assert.equal(weekly.buckets[0].key, '2025-02-24'); // 1 Mar is a Saturday: its week began on Monday 24 Feb
  const w = Object.fromEntries(weekly.buckets.map((b: any, i: number) => [b.key, weekly.series[0].points[i]]));
  assert.equal(w['2025-03-03'], 1_000);
  assert.equal(w['2025-03-31'], 6_000); // Mon 31 Mar and Tue 1 Apr share a week
  const monthly = await A.metric('ts.sales_orders', { range, granularity: 'month' });
  assert.deepEqual(monthly.buckets.map((b: any) => b.key), ['2025-03', '2025-04']);
  assert.deepEqual(monthly.series[0].points, [3_000, 4_000]);
});

// ── mix ──────────────────────────────────────────────────────────────────────────────────────────
test('order source mix: shares of net sales, largest first, empty sources left out', async () => {
  await seedOrders([
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 30_000, source: 'QR_TABLE' },
    { at: '2025-03-10T06:10:00Z', subtotalPaise: 10_000, source: 'TAKEAWAY' },
    { at: '2025-03-10T06:20:00Z', subtotalPaise: 10_000, source: 'TAKEAWAY' },
    { at: '2025-03-10T06:30:00Z', subtotalPaise: 99_000, source: 'STAFF', paymentStatus: 'UNPAID' }, // not revenue
  ]);
  const data = await A.metric('breakdown.source');
  assert.equal(data.kind, 'breakdown');
  assert.equal(data.unit, 'paise');
  assert.deepEqual(data.slices.map((s: any) => [s.id, s.label, s.value, s.share]), [
    ['QR_TABLE', 'QR table', 30_000, 60],
    ['TAKEAWAY', 'Counter / takeaway', 20_000, 40],
  ]);
});

test('payment mix uses plain names, and an old order with no source still counts', async () => {
  await seedOrders([
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 10_000, paymentMethod: 'CASH' },
    { at: '2025-03-10T06:10:00Z', subtotalPaise: 10_000, paymentMethod: 'ONLINE' },
    { at: '2025-03-10T06:20:00Z', subtotalPaise: 20_000, paymentMethod: 'CHECKOUT', omit: ['source'] },
  ]);
  const pay = await A.metric('breakdown.payment');
  assert.deepEqual(pay.slices.map((s: any) => s.label), ['Online checkout', 'Cash', 'UPI (direct)']);
  const source = await A.metric('breakdown.source');
  assert.deepEqual(source.slices.map((s: any) => [s.label, s.value]), [['Other', 20_000], ['QR table', 20_000]]); // equal values: by name
  const kpi = await A.metric('kpi.net_sales');
  assert.equal(kpi.value, 40_000, 'the old order is in the total');
});

test('mix of an empty period is simply empty', async () => {
  const data = await A.metric('breakdown.payment', { range: { from: '2020-01-01', to: '2020-01-01' } });
  assert.deepEqual(data.slices, []);
});

// ── average ticket by daypart ────────────────────────────────────────────────────────────────────
test('average ticket by daypart: four rows in day order, null where nothing was sold', async () => {
  await seedOrders([
    { at: '2025-03-10T03:30:00Z', subtotalPaise: 10_000 }, // 09:00 IST morning
    { at: '2025-03-10T04:30:00Z', subtotalPaise: 20_000 }, // 10:00 IST morning
    { at: '2025-03-10T13:30:00Z', subtotalPaise: 9_000 }, // 19:00 IST evening
  ]);
  const data = await A.metric('ranked.avg_ticket_by_daypart');
  assert.equal(data.kind, 'ranked');
  assert.deepEqual(data.columns.map((c: any) => [c.id, c.unit]), [['avg_ticket', 'paise'], ['orders', 'count']]);
  assert.deepEqual(data.rows.map((r: any) => [r.id, r.values.avg_ticket, r.values.orders]), [
    ['morning', 15_000, 2],
    ['afternoon', null, 0],
    ['evening', 9_000, 1],
    ['night', null, 0],
  ]);
  assert.equal(data.truncated, false);
});

// ── busy hours ───────────────────────────────────────────────────────────────────────────────────
test('busy hours: a Monday-first grid in local time (a 00:30 order is Monday, not Sunday)', async () => {
  await seedOrders([
    { at: '2025-03-10T09:00:00Z', subtotalPaise: 5_000 }, // Mon 14:30 IST
    { at: '2025-03-09T18:00:00Z', subtotalPaise: 7_000 }, // Sun 23:30 IST
    { at: '2025-03-09T19:00:00Z', subtotalPaise: 11_000 }, // Mon 00:30 IST (Sunday 19:00 in UTC)
    { at: '2025-03-10T09:10:00Z', subtotalPaise: 1_000 }, // Mon 14:40 IST: same cell as the first
  ]);
  const data = await A.metric('matrix.busy_hours', { range: { from: '2025-03-09', to: '2025-03-10' } });
  assert.equal(data.kind, 'matrix');
  assert.deepEqual(data.rows, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.equal(data.cols.length, 24);
  assert.equal(data.cols[0], '12am');
  assert.equal(data.cols[14], '2pm');
  assert.equal(data.layers.orders.length, 7);
  assert.equal(data.layers.orders[0].length, 24);
  assert.equal(data.layers.orders[0][14], 2);
  assert.equal(data.layers.sales[0][14], 6_000);
  assert.equal(data.layers.orders[6][23], 1); // Sunday 11:30pm
  assert.equal(data.layers.orders[0][0], 1); // Monday 12:30am
  assert.equal(data.layers.orders.flat().reduce((a: number, b: number) => a + b, 0), 4);
});

test('overview metrics honour the order-level slices', async () => {
  await seedOrders([
    { at: '2025-03-10T09:00:00Z', subtotalPaise: 5_000, source: 'QR_TABLE' },
    { at: '2025-03-10T09:10:00Z', subtotalPaise: 7_000, source: 'TAKEAWAY' },
  ]);
  const trend = await A.metric('ts.sales_orders', { source: ['TAKEAWAY'] });
  assert.equal(trend.series[0].points.reduce((a: number, b: number | null) => a + (b ?? 0), 0), 7_000);
  const mix = await A.metric('breakdown.payment', { source: ['QR_TABLE'] });
  assert.equal(mix.slices[0].value, 5_000);
  const grid = await A.metric('matrix.busy_hours', { source: ['QR_TABLE'] });
  assert.equal(grid.layers.orders.flat().reduce((a: number, b: number) => a + b, 0), 1);
});
