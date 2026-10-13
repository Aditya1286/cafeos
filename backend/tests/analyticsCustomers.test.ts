// The Customers metrics: active customers, new vs returning, visit frequency, top and lapsed
// customers. Only date range and comparison apply here; phones are masked in lists.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedOrders, clearSeededOrders, startAnalyticsHarness, AnalyticsHarness } from './analyticsFixtures';
import { maskPhone } from '../src/services/analytics/metrics/customers';

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

const ASHA = { phone: '9000000001', name: 'Asha' };
const BALA = { phone: '9000000002', name: 'Bala' };
const CHITRA = { phone: '9000000003', name: 'Chitra' };
const THREE_DAYS = { from: '2025-03-10', to: '2025-03-12' };

const seedPeople = () =>
  seedOrders([
    { at: '2025-03-01T06:00:00Z', subtotalPaise: 1_000, ...ASHA }, // Asha has ordered before: returning
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 3_000, ...ASHA },
    { at: '2025-03-10T04:30:00Z', subtotalPaise: 2_000, ...ASHA },
    { at: '2025-03-10T05:00:00Z', subtotalPaise: 4_000, ...BALA }, // Bala's first ever order: new
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 1_000, ...CHITRA },
    { at: '2025-03-10T06:10:00Z', subtotalPaise: 1_000, ...CHITRA },
    { at: '2025-03-10T06:20:00Z', subtotalPaise: 1_000, ...CHITRA },
    { at: '2025-03-10T07:00:00Z', subtotalPaise: 9_000, phone: '9000000004', name: 'Dev', paymentStatus: 'UNPAID' }, // never paid: not a customer yet
    // later in the three-day range
    { at: '2025-03-12T06:00:00Z', subtotalPaise: 2_500, ...BALA }, // Bala again: returning now
    { at: '2025-03-12T07:00:00Z', subtotalPaise: 1_500, phone: '9000000008', name: 'Hari' }, // new on the 12th
  ]);

test('masking keeps the first two and last two digits', () => {
  assert.equal(maskPhone('9000000001'), '90••••••01');
  assert.equal(maskPhone('+91 98765 43210'), '91••••••••10'); // 12 digits: 8 hidden
  assert.equal(maskPhone('123'), '••••');
  assert.equal(maskPhone(''), '••••');
});

test('active customers counts people with a paid order in the period, against the previous period', async () => {
  await seedOrders([
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 100, ...ASHA },
    { at: '2025-03-10T05:00:00Z', subtotalPaise: 100, ...ASHA }, // same person twice: one customer
    { at: '2025-03-10T06:00:00Z', subtotalPaise: 100, ...BALA },
    { at: '2025-03-10T07:00:00Z', subtotalPaise: 100, ...CHITRA, paymentStatus: 'UNPAID' },
    { at: '2025-03-09T04:00:00Z', subtotalPaise: 100, ...ASHA },
  ]);
  const data = await A.metric('kpi.active_customers', { compare: 'previous_period' });
  assert.deepEqual([data.value, data.previous, data.changePct], [2, 1, 100]);
});

test('new vs returning: a customer is new in the bucket of their first-ever order, returning after that', async () => {
  await seedPeople();
  const data = await A.metric('ts.new_vs_returning', { range: THREE_DAYS });
  assert.deepEqual(data.buckets.map((b: any) => b.key), ['2025-03-10', '2025-03-11', '2025-03-12']);
  const [fresh, returning] = data.series;
  assert.deepEqual([fresh.id, returning.id], ['new', 'returning']);
  assert.deepEqual(fresh.points, [2, 0, 1]); // 10th: Bala + Chitra; 12th: Hari
  assert.deepEqual(returning.points, [1, 0, 1]); // 10th: Asha; 12th: Bala (first seen on the 10th)
});

test('new vs returning rolls up into weeks too', async () => {
  await seedPeople();
  const data = await A.metric('ts.new_vs_returning', { range: { from: '2025-03-03', to: '2025-03-16' }, granularity: 'week' });
  assert.deepEqual(data.buckets.map((b: any) => b.key), ['2025-03-03', '2025-03-10']);
  assert.deepEqual(data.series[0].points, [0, 3]); // Bala, Chitra, Hari all started in the week of the 10th (Bala's second visit that week is not a new customer)
  assert.deepEqual(data.series[1].points, [0, 1]); // Asha, who had ordered before
});

test('visit frequency: customers by how many times they came, in order of frequency', async () => {
  await seedPeople();
  const data = await A.metric('breakdown.visit_frequency');
  assert.equal(data.unit, 'count');
  assert.deepEqual(data.slices.map((s: any) => [s.label, s.value, s.share]), [['1 visit', 1, 33.3], ['2 visits', 1, 33.3], ['3–5 visits', 1, 33.3]]);
});

test('top customers: by spend in the period, with the phone masked', async () => {
  await seedPeople();
  const data = await A.metric('ranked.top_customers');
  assert.deepEqual(data.columns.map((c: any) => [c.id, c.unit]), [['visits', 'count'], ['spent', 'paise']]);
  assert.deepEqual(data.rows.map((r: any) => [r.label, r.sublabel, r.values.visits, r.values.spent]), [
    ['Asha', '90••••••01', 2, 5_000],
    ['Bala', '90••••••02', 1, 4_000],
    ['Chitra', '90••••••03', 3, 3_000],
  ]);
  assert.equal(JSON.stringify(data).includes('9000000001'), false, 'the full number never leaves the server, not even as a row id');
  assert.deepEqual(data.rows.map((r: any) => r.id), ['customer-1', 'customer-2', 'customer-3']);
  assert.equal(data.truncated, false);
});

test('lapsed customers: regulars (2+ visits) not seen for 30 days, measured at the end of the period', async () => {
  await seedOrders([
    { at: '2025-01-01T06:00:00Z', subtotalPaise: 5_000, phone: '9000000005', name: 'Eve' },
    { at: '2025-01-05T06:00:00Z', subtotalPaise: 3_000, phone: '9000000005', name: 'Eve' }, // 2 visits, gone since January
    { at: '2025-01-01T06:00:00Z', subtotalPaise: 9_000, phone: '9000000006', name: 'Frank' }, // one visit only: not a regular
    { at: '2025-02-20T06:00:00Z', subtotalPaise: 1_000, phone: '9000000007', name: 'Gita' },
    { at: '2025-03-05T06:00:00Z', subtotalPaise: 1_000, phone: '9000000007', name: 'Gita' }, // 5 days ago: still around
    { at: '2025-03-10T04:00:00Z', subtotalPaise: 1_000, ...ASHA },
    { at: '2025-03-01T04:00:00Z', subtotalPaise: 1_000, ...ASHA }, // ordered in the period: not lapsed
    { at: '2025-03-20T06:00:00Z', subtotalPaise: 1_000, phone: '9000000005', name: 'Eve' }, // back AFTER the period: lapsed as of the 10th
  ]);
  const data = await A.metric('ranked.lapsed_customers');
  assert.deepEqual(data.rows.map((r: any) => r.label), ['Eve']);
  const eve = data.rows[0];
  assert.deepEqual([eve.sublabel, eve.values.visits, eve.values.spent], ['90••••••05', 2, 8_000]);
  const expectedDays = Math.floor((Date.parse('2025-03-10T18:30:00Z') - Date.parse('2025-01-05T06:00:00Z')) / 86_400_000);
  assert.equal(eve.values.days, expectedDays);
  assert.match(data.note, /1 regulars/);
  assert.equal(JSON.stringify(data).includes('9000000005'), false);
});

test('customer metrics ignore order slices and item filters, and say so', async () => {
  await seedPeople();
  const res = await A.query(A.owner, ['kpi.active_customers', 'ranked.top_customers'], { source: ['TAKEAWAY'], veg: 'veg', paymentMethod: ['CARD'] });
  assert.equal(res.status, 200);
  for (const id of ['kpi.active_customers', 'ranked.top_customers']) {
    assert.deepEqual(res.body.results[id].data.notApplied, ['source', 'paymentMethod', 'veg']);
  }
  assert.equal(res.body.results['kpi.active_customers'].data.value, 3, 'the numbers are unfiltered');
});

test('an empty period gives empty lists and zero, not errors', async () => {
  const range = { range: { from: '2020-01-01', to: '2020-01-05' } };
  assert.equal((await A.metric('kpi.active_customers', range)).value, 0);
  assert.deepEqual((await A.metric('breakdown.visit_frequency', range)).slices, []);
  assert.deepEqual((await A.metric('ranked.top_customers', range)).rows, []);
  const series = await A.metric('ts.new_vs_returning', range);
  assert.deepEqual(series.series[0].points, [0, 0, 0, 0, 0]);
});
