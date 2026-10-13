// The analytics query parser: only values from fixed sets get through, defaults fill the gaps, and
// every malformed input is a plain 400 rather than something a metric has to defend against.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnalyticsRequest, MAX_METRICS_PER_REQUEST, hasItemFilters, hasSlices } from '../src/services/analytics/filters';
import { ServiceError } from '../src/utils/serviceError';

const bad = (body: unknown) => {
  try {
    parseAnalyticsRequest(body);
  } catch (e) {
    assert.ok(e instanceof ServiceError, 'a ServiceError, not a crash');
    assert.equal(e.statusCode, 400);
    assert.equal(e.code, 'INVALID_INPUT');
    return e.message;
  }
  assert.fail(`expected a 400 for ${JSON.stringify(body)}`);
};

test('fills defaults: last 7 days, previous period, auto granularity, no slices', () => {
  const { metrics, filters } = parseAnalyticsRequest({ metrics: ['kpi.net_sales'] });
  assert.deepEqual(metrics, ['kpi.net_sales']);
  assert.deepEqual(filters, {
    range: { preset: 'last7' },
    compare: 'previous_period',
    granularity: 'auto',
    source: [],
    paymentMethod: [],
    daypart: [],
    categoryIds: [],
    veg: null,
  });
  assert.equal(hasSlices(filters), false);
  assert.equal(hasItemFilters(filters), false);
});

test('accepts a full, valid set of filters', () => {
  const cat = 'a'.repeat(24);
  const { filters } = parseAnalyticsRequest({
    metrics: ['kpi.orders', 'ts.sales_orders'],
    filters: {
      range: { from: '2026-10-01', to: '2026-10-13' },
      compare: 'same_period_last_week',
      granularity: 'day',
      source: ['QR_TABLE', 'TAKEAWAY'],
      paymentMethod: ['CASH'],
      daypart: ['morning', 'night'],
      categoryIds: [cat],
      veg: 'veg',
    },
  });
  assert.deepEqual(filters.range, { from: '2026-10-01', to: '2026-10-13' });
  assert.equal(filters.compare, 'same_period_last_week');
  assert.deepEqual(filters.source, ['QR_TABLE', 'TAKEAWAY']);
  assert.deepEqual(filters.categoryIds, [cat]);
  assert.equal(hasSlices(filters), true);
  assert.equal(hasItemFilters(filters), true);
});

test('every range preset is accepted', () => {
  for (const preset of ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth']) {
    assert.deepEqual(parseAnalyticsRequest({ metrics: ['x.y'], filters: { range: { preset } } }).filters.range, { preset });
  }
});

test('metrics: required, de-duplicated, capped, and plain short strings only', () => {
  assert.deepEqual(parseAnalyticsRequest({ metrics: ['a.b', 'a.b', 'c.d'] }).metrics, ['a.b', 'c.d']);
  bad({});
  bad({ metrics: [] });
  bad({ metrics: 'kpi.net_sales' });
  bad({ metrics: [42] });
  bad({ metrics: [''] });
  bad({ metrics: ['x'.repeat(65)] });
  bad({ metrics: [{ $ne: null }] });
  bad({ metrics: Array.from({ length: MAX_METRICS_PER_REQUEST + 1 }, (_, i) => `m.${i}`) });
  assert.equal(parseAnalyticsRequest({ metrics: Array.from({ length: MAX_METRICS_PER_REQUEST }, (_, i) => `m.${i}`) }).metrics.length, MAX_METRICS_PER_REQUEST);
});

test('the body and filters must be objects', () => {
  bad(null);
  bad([]);
  bad('metrics');
  bad({ metrics: ['a.b'], filters: [] });
  bad({ metrics: ['a.b'], filters: 'last7' });
});

test('custom ranges: real dates, in order, at most 366 days', () => {
  const range = (r: unknown) => ({ metrics: ['a.b'], filters: { range: r } });
  bad(range({ from: '2026-02-30', to: '2026-03-02' }));
  bad(range({ from: '2026-10-13', to: '2026-10-01' }));
  bad(range({ from: '2026-10-01' }));
  bad(range({ from: 20261001, to: 20261013 }));
  bad(range({ preset: 'forever' }));
  bad(range('last7'));
  bad(range({ from: '2025-01-01', to: '2026-01-02' })); // 367 days
  assert.doesNotThrow(() => parseAnalyticsRequest(range({ from: '2025-01-01', to: '2025-12-31' }))); // 365 days
  assert.doesNotThrow(() => parseAnalyticsRequest(range({ from: '2024-01-01', to: '2024-12-31' }))); // 366 days (leap year)
  assert.doesNotThrow(() => parseAnalyticsRequest(range({ from: '2026-10-13', to: '2026-10-13' }))); // a single day
});

test('compare, granularity, slices and item filters accept only known values', () => {
  const f = (filters: unknown) => ({ metrics: ['a.b'], filters });
  bad(f({ compare: 'yesterday' }));
  bad(f({ compare: 5 }));
  bad(f({ granularity: 'minute' }));
  bad(f({ source: ['WAITER'] }));
  bad(f({ source: 'QR_TABLE' }));
  bad(f({ paymentMethod: ['BITCOIN'] }));
  bad(f({ daypart: ['brunch'] }));
  bad(f({ categoryIds: ['not-an-id'] }));
  bad(f({ categoryIds: [{ $ne: null }] }));
  bad(f({ categoryIds: Array.from({ length: 51 }, () => 'a'.repeat(24)) }));
  bad(f({ veg: 'vegan' }));
  assert.equal(parseAnalyticsRequest(f({ granularity: 'auto' })).filters.granularity, 'auto');
  assert.deepEqual(parseAnalyticsRequest(f({ source: ['CASH_COUNTER'.slice(0, 0) + 'ADMIN', 'ADMIN'] })).filters.source, ['ADMIN']); // de-duplicated
  assert.equal(parseAnalyticsRequest(f({ veg: null })).filters.veg, null);
});

test('unknown extra fields are ignored, not echoed into the filters', () => {
  const { filters } = parseAnalyticsRequest({ metrics: ['a.b'], filters: { businessId: 'abc', range: { preset: 'today' }, $where: '1' } });
  assert.deepEqual(Object.keys(filters).sort(), ['categoryIds', 'compare', 'daypart', 'granularity', 'paymentMethod', 'range', 'source', 'veg']);
});
