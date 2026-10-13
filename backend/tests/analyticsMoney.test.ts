// The Money metrics: cancellations, refunds, orders served but not paid for, GST collected.
// These look at every order placed (not only revenue), so cancelled and unpaid orders matter here.
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

/** Ten orders on 10 March 2025; see the totals asserted below. */
const seedMoneyDay = () =>
  seedOrders([
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 10_000, taxPaise: 500 }, // paid: bill 10500, GST 500
    { at: '2025-03-10T04:10:00Z', subtotalPaise: 20_000, taxPaise: 1_000 }, // paid: bill 21000, GST 1000
    { at: '2025-03-10T05:00:00Z', subtotalPaise: 8_000, taxPaise: 400, paymentStatus: 'UNPAID', orderStatus: 'COMPLETED' }, // served, never paid: 8400
    { at: '2025-03-10T05:10:00Z', subtotalPaise: 3_000, paymentStatus: 'UNPAID', orderStatus: 'SERVED' }, // 3000
    { at: '2025-03-10T05:20:00Z', subtotalPaise: 5_000, paymentStatus: 'UNPAID', orderStatus: 'PLACED' }, // still in progress: not "served"
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 6_000, taxPaise: 300, orderStatus: 'CANCELLED', paymentStatus: 'PAID', refundRequestedAt: '2025-03-10T06:30:00Z', cancellationReason: 'Customer left' }, // refund waiting: 6300
    { at: '2025-03-10T06:10:00Z', subtotalPaise: 4_000, orderStatus: 'REFUNDED', paymentStatus: 'REFUNDED', refundRequestedAt: '2025-03-10T06:40:00Z', refundedAt: '2025-03-10T07:00:00Z', cancellationReason: 'Customer left' }, // refunded: 4000
    { at: '2025-03-10T07:00:00Z', subtotalPaise: 2_000, orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', cancellationReason: 'Out of stock' },
    { at: '2025-03-10T07:10:00Z', subtotalPaise: 2_000, orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', cancellationReason: '  out of STOCK ' }, // same reason, different spelling
    { at: '2025-03-10T07:20:00Z', subtotalPaise: 1_500, orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', cancellationReason: '' }, // no reason
  ]);

test('cancellation rate, refunds, refunds waiting, served-but-unpaid, and GST', async () => {
  await seedMoneyDay();
  const get = async (id: string) => A.metric(id);
  const rate = await get('kpi.cancel_rate');
  assert.deepEqual([rate.kind, rate.unit, rate.value], ['kpi', 'percent', 50]); // 5 of 10 orders
  const refunds = await get('kpi.refunds');
  assert.deepEqual([refunds.unit, refunds.value], ['paise', 4_000]);
  assert.equal((await get('kpi.refund_pending')).value, 6_300);
  assert.equal((await get('kpi.unpaid_served')).value, 8_400 + 3_000);
  assert.equal((await get('kpi.gst_collected')).value, 1_500, 'GST on revenue orders only: not the cancelled one');
});

test('against the previous period; nothing to divide by gives null', async () => {
  await seedMoneyDay();
  await seedOrders([{ at: '2025-03-09T04:00:00Z', subtotalPaise: 10_000, taxPaise: 800 }]);
  const rate = await A.metric('kpi.cancel_rate', { compare: 'previous_period' });
  assert.deepEqual([rate.value, rate.previous, rate.changePct], [50, 0, null]);
  const gst = await A.metric('kpi.gst_collected', { compare: 'previous_period' });
  assert.deepEqual([gst.value, gst.previous, gst.changePct], [1_500, 800, 87.5]);
});

test('cancellations over time: orders placed and orders cancelled per bucket', async () => {
  await seedMoneyDay();
  const data = await A.metric('ts.cancellations');
  assert.equal(data.kind, 'series');
  const [placed, cancelled] = data.series;
  assert.deepEqual([placed.id, cancelled.id, placed.unit], ['orders', 'cancelled', 'count']);
  assert.equal(placed.points.reduce((a: number, b: number | null) => a + (b ?? 0), 0), 10);
  assert.equal(cancelled.points.reduce((a: number, b: number | null) => a + (b ?? 0), 0), 5);
  // 06:00Z = 11:30 IST: two cancellations that hour (the cancelled-and-refund-waiting one and the refunded one)
  assert.equal(cancelled.points[11], 2);
  const weekly = await A.metric('ts.cancellations', { range: { from: '2025-03-03', to: '2025-03-16' }, granularity: 'week' });
  assert.deepEqual(weekly.buckets.map((b: any) => b.key), ['2025-03-03', '2025-03-10']);
  assert.deepEqual(weekly.series[0].points, [0, 10]);
});

test('cancel reasons: grouped ignoring case and spacing, biggest first, with the bill value', async () => {
  await seedMoneyDay();
  const data = await A.metric('ranked.cancel_reasons');
  assert.equal(data.kind, 'ranked');
  assert.deepEqual(data.columns.map((c: any) => [c.id, c.unit]), [['orders', 'count'], ['lost', 'paise']]);
  assert.deepEqual(data.rows.map((r: any) => [r.label, r.values.orders, r.values.lost]), [
    ['Customer left', 2, 6_300 + 4_000],
    ['Out of stock', 2, 4_000],
    ['No reason given', 1, 1_500],
  ]);
  assert.equal(data.truncated, false);
});

test('cancel reasons are capped and the cap is reported', async () => {
  await seedOrders(Array.from({ length: 10 }, (_, i) => ({ at: '2025-03-10T04:00:00Z', subtotalPaise: 100, orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', cancellationReason: `reason ${i}` })));
  const data = await A.metric('ranked.cancel_reasons');
  assert.equal(data.rows.length, 8);
  assert.equal(data.truncated, true);
});

test('reasons are plain text: markup is not interpreted and long ones are cut', async () => {
  await seedOrders([{ at: '2025-03-10T04:00:00Z', subtotalPaise: 100, orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', cancellationReason: `<img src=x onerror=alert(1)>${'z'.repeat(200)}` }]);
  const data = await A.metric('ranked.cancel_reasons');
  assert.ok(data.rows[0].label.length <= 80);
  assert.equal(typeof data.rows[0].label, 'string');
});

test('old orders missing fields (no tax, no reason) are counted, not crashed on', async () => {
  await seedOrders([
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 1_000, omit: ['taxPaise', 'cancellationReason', 'totalAmountPaise'] },
    { at: '2025-03-10T04:10:00Z', subtotalPaise: 1_000, orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', omit: ['cancellationReason', 'totalAmountPaise'] },
  ]);
  const res = await A.query(A.owner, ['kpi.cancel_rate', 'kpi.gst_collected', 'kpi.unpaid_served', 'ranked.cancel_reasons']);
  for (const outcome of Object.values<any>(res.body.results)) assert.equal(outcome.ok, true, JSON.stringify(outcome));
  assert.equal(res.body.results['kpi.cancel_rate'].data.value, 50);
  assert.equal(res.body.results['ranked.cancel_reasons'].data.rows[0].label, 'No reason given');
});

test('money metrics honour order slices; item filters are reported as not applied', async () => {
  await seedOrders([
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 1_000, source: 'TAKEAWAY', orderStatus: 'CANCELLED', paymentStatus: 'UNPAID', cancellationReason: 'x' },
    { at: '2025-03-10T04:10:00Z', subtotalPaise: 1_000, source: 'QR_TABLE' },
    { at: '2025-03-10T04:20:00Z', subtotalPaise: 1_000, source: 'QR_TABLE' },
  ]);
  assert.equal((await A.metric('kpi.cancel_rate', { source: ['TAKEAWAY'] })).value, 100);
  assert.equal((await A.metric('kpi.cancel_rate', { source: ['QR_TABLE'] })).value, 0);
  const res = await A.query(A.owner, ['kpi.cancel_rate'], { veg: 'veg' });
  assert.deepEqual(res.body.results['kpi.cancel_rate'].data.notApplied, ['veg']);
  assert.equal(res.body.results['kpi.cancel_rate'].data.value, 33.3);
});

test('an empty period: zero money, no rate, no rows', async () => {
  const range = { range: { from: '2020-01-01', to: '2020-01-01' } };
  assert.equal((await A.metric('kpi.cancel_rate', range)).value, null);
  for (const id of ['kpi.refunds', 'kpi.refund_pending', 'kpi.unpaid_served', 'kpi.gst_collected']) assert.equal((await A.metric(id, range)).value, 0, id);
  assert.deepEqual((await A.metric('ranked.cancel_reasons', range)).rows, []);
});
