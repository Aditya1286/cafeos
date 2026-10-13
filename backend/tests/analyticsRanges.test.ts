// Date arithmetic for analytics: ranges, compare periods and buckets in the business's own
// timezone, including the awkward days (daylight-saving changes, month ends, leap days).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as dk from '../src/services/analytics/dateKeys';
import * as r from '../src/services/analytics/ranges';
import { daypartOfHour, hoursForDayparts, DAYPART_HOURS } from '../src/services/analytics/dayparts';
import { ServiceError } from '../src/utils/serviceError';

const IST = 'Asia/Kolkata';
const LA = 'America/Los_Angeles';
const NOW = new Date('2026-10-13T05:00:00Z'); // 10:30 on Tue 13 Oct in India

test('date keys: calendar arithmetic with no timezone in it', () => {
  assert.equal(dk.addDaysKey('2026-02-28', 1), '2026-03-01');
  assert.equal(dk.addDaysKey('2026-01-01', -1), '2025-12-31');
  assert.equal(dk.diffDaysKey('2026-10-13', '2026-10-06'), 7);
  assert.equal(dk.mondayOfKey('2026-10-13'), '2026-10-12'); // a Tuesday
  assert.equal(dk.mondayOfKey('2026-10-12'), '2026-10-12');
  assert.equal(dk.mondayOfKey('2026-10-18'), '2026-10-12'); // a Sunday belongs to the week before
  assert.equal(dk.shiftYearsKey('2024-02-29', -1), '2023-02-28');
  assert.equal(dk.shiftYearsKey('2026-10-13', -1), '2025-10-13');
  assert.equal(dk.firstOfMonthKey('2026-10-13'), '2026-10-01');
  assert.ok(dk.isValidDateKey('2024-02-29'));
  assert.ok(!dk.isValidDateKey('2026-02-29'));
  assert.ok(!dk.isValidDateKey('2026-13-01'));
  assert.ok(!dk.isValidDateKey('26-1-1'));
});

test('local midnight: right for India, extreme zones, and days that contain a daylight-saving change', () => {
  assert.equal(r.localDateKey(new Date('2026-10-12T18:30:00Z'), IST), '2026-10-13'); // 00:00 IST
  assert.equal(r.localDateKey(new Date('2026-10-12T18:29:59Z'), IST), '2026-10-12');
  assert.equal(r.dateKeyToInstant(IST, '2026-10-13').toISOString(), '2026-10-12T18:30:00.000Z');
  assert.equal(r.dateKeyToInstant('Pacific/Kiritimati', '2026-10-13').toISOString(), '2026-10-12T10:00:00.000Z'); // UTC+14
  assert.equal(r.dateKeyToInstant(LA, '2026-10-13').toISOString(), '2026-10-13T07:00:00.000Z'); // PDT
  assert.equal(r.dateKeyToInstant(LA, '2026-11-01').toISOString(), '2026-11-01T07:00:00.000Z'); // the day DST ends: midnight is still PDT
  assert.equal(r.dateKeyToInstant(LA, '2026-11-02').toISOString(), '2026-11-02T08:00:00.000Z'); // PST
  assert.equal(r.dateKeyToInstant(LA, '2026-03-08').toISOString(), '2026-03-08T08:00:00.000Z'); // the day DST starts: midnight is still PST
  assert.equal(r.dateKeyToInstant(LA, '2026-03-09').toISOString(), '2026-03-09T07:00:00.000Z');
});

test('range presets and custom ranges resolve to whole business-local days', () => {
  const today = r.resolveRange({ preset: 'today' }, IST, NOW);
  assert.equal(today.start.toISOString(), '2026-10-12T18:30:00.000Z');
  assert.equal(today.end.toISOString(), '2026-10-13T18:30:00.000Z');

  const l7 = r.resolveRange({ preset: 'last7' }, IST, NOW);
  assert.equal(r.rangeDays(l7, IST), 7);
  assert.equal(r.localDateKey(l7.start, IST), '2026-10-07');

  const l30 = r.resolveRange({ preset: 'last30' }, IST, NOW);
  assert.equal(r.rangeDays(l30, IST), 30);

  const yesterday = r.resolveRange({ preset: 'yesterday' }, IST, NOW);
  assert.equal(r.localDateKey(yesterday.start, IST), '2026-10-12');
  assert.equal(yesterday.end.toISOString(), today.start.toISOString());

  const thisMonth = r.resolveRange({ preset: 'thisMonth' }, IST, NOW);
  assert.equal(r.localDateKey(thisMonth.start, IST), '2026-10-01');
  assert.equal(r.rangeDays(thisMonth, IST), 13);

  const lastMonth = r.resolveRange({ preset: 'lastMonth' }, IST, NOW);
  assert.equal(r.localDateKey(lastMonth.start, IST), '2026-09-01');
  assert.equal(r.rangeDays(lastMonth, IST), 30);

  // January looks back into the previous year
  const jan = r.resolveRange({ preset: 'lastMonth' }, IST, new Date('2026-01-15T05:00:00Z'));
  assert.equal(r.localDateKey(jan.start, IST), '2025-12-01');
  assert.equal(r.rangeDays(jan, IST), 31);

  const custom = r.resolveRange({ from: '2026-10-01', to: '2026-10-03' }, IST, NOW);
  assert.equal(r.rangeDays(custom, IST), 3);
});

test('an order at 23:30 local belongs to that local day, not the next UTC day', () => {
  const late = new Date('2026-10-12T18:00:00Z'); // 23:30 IST on 12 Oct (still 12 Oct in UTC too)
  assert.equal(r.localDateKey(late, IST), '2026-10-12');
  const justAfter = new Date('2026-10-12T19:00:00Z'); // 00:30 IST on 13 Oct
  assert.equal(r.localDateKey(justAfter, IST), '2026-10-13');
  assert.equal(r.bucketKeyOfInstant(late, IST, 'day'), '2026-10-12');
  assert.equal(r.bucketKeyOfInstant(justAfter, IST, 'day'), '2026-10-13');
  assert.equal(r.bucketKeyOfInstant(justAfter, IST, 'hour'), '2026-10-13T00');
});

test('compare ranges: previous period, last week, last year, and none', () => {
  const past = r.resolveRange({ from: '2026-10-01', to: '2026-10-07' }, IST, NOW);
  const prev = r.resolveCompareRange(past, 'previous_period', IST, NOW)!;
  assert.equal(r.localDateKey(prev.start, IST), '2026-09-24');
  assert.equal(r.localDateKey(prev.end, IST), '2026-10-01');
  const week = r.resolveCompareRange(past, 'same_period_last_week', IST, NOW)!;
  assert.equal(r.localDateKey(week.start, IST), '2026-09-24');
  assert.equal(r.localDateKey(week.end, IST), '2026-10-01'); // the end is exclusive: 24–30 Sep inclusive
  const year = r.resolveCompareRange(past, 'same_period_last_year', IST, NOW)!;
  assert.equal(r.localDateKey(year.start, IST), '2025-10-01');
  assert.equal(r.resolveCompareRange(past, 'none', IST, NOW), null);
});

test('a range still in progress compares with the same ELAPSED time, not the whole earlier period', () => {
  const today = r.resolveRange({ preset: 'today' }, IST, NOW);
  const cmp = r.resolveCompareRange(today, 'previous_period', IST, NOW)!;
  assert.equal(cmp.start.toISOString(), '2026-10-11T18:30:00.000Z'); // yesterday 00:00
  assert.equal(cmp.end.getTime() - cmp.start.getTime(), NOW.getTime() - today.start.getTime()); // ...up to 10:30

  const l7 = r.resolveRange({ preset: 'last7' }, IST, NOW);
  const cmp7 = r.resolveCompareRange(l7, 'previous_period', IST, NOW)!;
  assert.equal(cmp7.end.getTime() - cmp7.start.getTime(), NOW.getTime() - l7.start.getTime());

  // a range that has not started yet has nothing to compare
  const future = r.resolveRange({ from: '2026-12-01', to: '2026-12-02' }, IST, NOW);
  const cmpFuture = r.resolveCompareRange(future, 'previous_period', IST, NOW)!;
  assert.equal(cmpFuture.end.getTime(), cmpFuture.start.getTime());
});

test('buckets for a range cut off mid-day still include the partial day', () => {
  const l7 = r.resolveRange({ preset: 'last7' }, IST, NOW);
  const cmp = r.resolveCompareRange(l7, 'previous_period', IST, NOW)!; // 6 whole days and 10.5 hours
  assert.equal(r.rangeDays(cmp, IST), 7);
  assert.equal(r.bucketsFor(cmp, IST, 'day').length, 7);
  const today = r.resolveRange({ preset: 'today' }, IST, NOW);
  const cmpToday = r.resolveCompareRange(today, 'previous_period', IST, NOW)!; // yesterday up to 10:30
  assert.equal(r.bucketsFor(cmpToday, IST, 'day').length, 1);
  assert.equal(r.bucketsFor(cmpToday, IST, 'hour').length, 11); // 12am through 10am
  // an empty range has no buckets at all
  const empty = { start: today.start, end: today.start };
  assert.equal(r.rangeDays(empty, IST), 0);
  assert.equal(r.bucketsFor(empty, IST, 'day').length, 0);
});

test('granularity: automatic by range length, hourly only for short ranges', () => {
  assert.equal(r.autoGranularity(1), 'hour');
  assert.equal(r.autoGranularity(2), 'hour');
  assert.equal(r.autoGranularity(3), 'day');
  assert.equal(r.autoGranularity(31), 'day');
  assert.equal(r.autoGranularity(32), 'week');
  assert.equal(r.autoGranularity(120), 'week');
  assert.equal(r.autoGranularity(121), 'month');

  const month = r.resolveRange({ preset: 'last30' }, IST, NOW);
  assert.equal(r.resolveGranularity('auto', month, IST), 'day');
  assert.equal(r.resolveGranularity('week', month, IST), 'week');
  assert.throws(() => r.resolveGranularity('hour', month, IST), (e: unknown) => e instanceof ServiceError && e.statusCode === 400);
  const fortnight = r.resolveRange({ from: '2026-10-01', to: '2026-10-14' }, IST, NOW);
  assert.equal(r.resolveGranularity('hour', fortnight, IST), 'hour');
});

test('buckets: every bucket in the range appears, in order, even empty ones', () => {
  const today = r.resolveRange({ preset: 'today' }, IST, NOW);
  const hours = r.bucketsFor(today, IST, 'hour');
  assert.equal(hours.length, 24);
  assert.equal(hours[0].key, '2026-10-13T00');
  assert.equal(hours[0].label, '12am');
  assert.equal(hours[13].label, '1pm');

  const l7 = r.resolveRange({ preset: 'last7' }, IST, NOW);
  const days = r.bucketsFor(l7, IST, 'day');
  assert.equal(days.length, 7);
  assert.equal(days[0].key, '2026-10-07');
  assert.equal(days[0].label, '7 Oct');

  const october = r.resolveRange({ from: '2026-10-01', to: '2026-10-31' }, IST, NOW);
  const weeks = r.bucketsFor(october, IST, 'week');
  assert.deepEqual(weeks.map((b) => b.key), ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26']);
  assert.equal(weeks[0].start.toISOString(), r.dateKeyToInstant(IST, '2026-10-01').toISOString()); // the first week starts where the range does

  const months = r.bucketsFor(r.resolveRange({ from: '2026-08-15', to: '2026-10-05' }, IST, NOW), IST, 'month');
  assert.deepEqual(months.map((b) => b.key), ['2026-08', '2026-09', '2026-10']);
  assert.equal(months[0].label, 'Aug 2026');

  const twoDays = r.bucketsFor(r.resolveRange({ from: '2026-10-12', to: '2026-10-13' }, IST, NOW), IST, 'hour');
  assert.equal(twoDays.length, 48);
  assert.equal(twoDays[0].label, 'Mon 12am');
});

test('buckets on daylight-saving days: no hour is lost or double-counted', () => {
  const later = new Date('2026-12-01T00:00:00Z');
  const fall = r.resolveRange({ from: '2026-11-01', to: '2026-11-01' }, LA, later);
  assert.equal(fall.end.getTime() - fall.start.getTime(), 25 * 3_600_000);
  assert.equal(r.bucketsFor(fall, LA, 'hour').length, 24); // the repeated 1am is one bucket
  const spring = r.resolveRange({ from: '2026-03-08', to: '2026-03-08' }, LA, later);
  assert.equal(spring.end.getTime() - spring.start.getTime(), 23 * 3_600_000);
  assert.equal(r.bucketsFor(spring, LA, 'hour').length, 23);
});

test('dayparts: fixed local hours, night wraps midnight, no hour in two dayparts', () => {
  assert.equal(daypartOfHour(5), 'morning');
  assert.equal(daypartOfHour(10), 'morning');
  assert.equal(daypartOfHour(11), 'afternoon');
  assert.equal(daypartOfHour(15), 'afternoon');
  assert.equal(daypartOfHour(16), 'evening');
  assert.equal(daypartOfHour(20), 'evening');
  assert.equal(daypartOfHour(21), 'night');
  assert.equal(daypartOfHour(0), 'night');
  assert.equal(daypartOfHour(4), 'night');
  const all = Object.values(DAYPART_HOURS).flat().sort((a, b) => a - b);
  assert.deepEqual(all, Array.from({ length: 24 }, (_, i) => i));
  assert.deepEqual(hoursForDayparts(['night', 'morning']), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21, 22, 23]);
  assert.deepEqual(hoursForDayparts([]), []);
});
