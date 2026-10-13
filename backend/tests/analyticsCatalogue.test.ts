// The whole catalogue at once: the exact set of metric ids (the frontend's views rely on them) and
// every metric answering for every range preset and comparison, on the demo café's real data.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startAnalyticsHarness, AnalyticsHarness } from './analyticsFixtures';
import { listMetricIds } from '../src/services/analytics/registry';

let A: AnalyticsHarness;
before(async () => {
  A = await startAnalyticsHarness();
});
after(async () => {
  await A.stop();
});

const BUILT_IN = [
  // Overview
  'kpi.net_sales', 'kpi.orders', 'kpi.avg_ticket', 'kpi.items_per_order', 'ts.sales_orders', 'breakdown.source', 'breakdown.payment', 'ranked.avg_ticket_by_daypart', 'matrix.busy_hours',
  // Menu
  'ranked.items', 'breakdown.category', 'breakdown.veg', 'kpi.addon_attach_rate', 'ranked.slow_movers',
  // Customers
  'kpi.active_customers', 'ts.new_vs_returning', 'breakdown.visit_frequency', 'ranked.top_customers', 'ranked.lapsed_customers',
  // Kitchen
  'kpi.prep_median', 'kpi.prep_p90', 'kpi.fulfil_median', 'kpi.late_rate', 'ts.kitchen_times', 'ts.throughput_by_hour',
  // Money
  'kpi.cancel_rate', 'kpi.refunds', 'kpi.refund_pending', 'kpi.unpaid_served', 'kpi.gst_collected', 'ts.cancellations', 'ranked.cancel_reasons',
];

test('the built-in catalogue is exactly the agreed set of metric ids (the frontend relies on them)', () => {
  const builtIn = listMetricIds().filter((id) => !id.startsWith('test.'));
  assert.deepEqual([...builtIn].sort(), [...BUILT_IN].sort());
});

test('every metric answers for every range preset and comparison, on the demo café’s real data', async () => {
  const presets = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth'];
  const compares = ['none', 'previous_period', 'same_period_last_week', 'same_period_last_year'];
  for (const [i, preset] of presets.entries()) {
    const compare = compares[i % compares.length];
    for (let from = 0; from < BUILT_IN.length; from += 16) {
      const res = await A.query(A.owner, BUILT_IN.slice(from, from + 16), { range: { preset }, compare });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      for (const [id, outcome] of Object.entries<any>(res.body.results)) {
        assert.equal(outcome.ok, true, `${id} for ${preset}/${compare}: ${JSON.stringify(outcome)}`);
        assert.ok(['kpi', 'series', 'ranked', 'breakdown', 'matrix'].includes(outcome.data.kind), id);
      }
    }
  }
});
