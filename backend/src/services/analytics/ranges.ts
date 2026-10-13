import { Bucket, CompareMode, Granularity, RangeInput, ResolvedRange } from './types';
import { addDaysKey, diffDaysKey, firstOfMonthKey, mondayOfKey, parseDateKey, shiftYearsKey } from './dateKeys';
import { ServiceError } from '../../utils/serviceError';

const pad = (n: number) => String(n).padStart(2, '0');

const localFormatter = (tz: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });

/** The business-local calendar date of an instant, as 'YYYY-MM-DD'. */
export const localDateKey = (date: Date, tz: string): string => {
  const parts = localFormatter(tz).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** The business-local hour (0–23) of an instant. */
export const localHour = (date: Date, tz: string): number =>
  Number(localFormatter(tz).formatToParts(date).find((p) => p.type === 'hour')!.value) % 24;

/** How far `tz` is ahead of UTC at this instant, in ms (to the second). */
const offsetMs = (ms: number, tz: string): number => {
  const secs = Math.floor(ms / 1000) * 1000;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(secs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')) - secs;
};

/**
 * The instant of 00:00 local time, in `tz`, on the calendar day `key`. The offset is re-read at each
 * guess, so a day that contains a daylight-saving change still lands on its real midnight (the older
 * utils/timezone.ts helper reads the offset once and is an hour out on such days).
 */
export const dateKeyToInstant = (tz: string, key: string): Date => {
  const [y, m, d] = parseDateKey(key);
  const wall = Date.UTC(y, m - 1, d);
  let t = wall - offsetMs(wall, tz);
  t = wall - offsetMs(t, tz);
  t = wall - offsetMs(t, tz);
  return new Date(t);
};

export const resolveRange = (input: RangeInput, tz: string, now: Date): ResolvedRange => {
  const todayKey = localDateKey(now, tz);
  const span = (fromKey: string, toKeyInclusive: string): ResolvedRange => ({
    start: dateKeyToInstant(tz, fromKey),
    end: dateKeyToInstant(tz, addDaysKey(toKeyInclusive, 1)),
  });
  if ('from' in input) return span(input.from, input.to);
  switch (input.preset) {
    case 'today':
      return span(todayKey, todayKey);
    case 'yesterday':
      return span(addDaysKey(todayKey, -1), addDaysKey(todayKey, -1));
    case 'last7':
      return span(addDaysKey(todayKey, -6), todayKey);
    case 'last30':
      return span(addDaysKey(todayKey, -29), todayKey);
    case 'thisMonth':
      return span(firstOfMonthKey(todayKey), todayKey);
    case 'lastMonth': {
      const lastDay = addDaysKey(firstOfMonthKey(todayKey), -1);
      return span(firstOfMonthKey(lastDay), lastDay);
    }
  }
};

/** The comparison period, covering the same ELAPSED time: today at 10am compares with yesterday up to 10am. */
export const resolveCompareRange = (range: ResolvedRange, mode: CompareMode, tz: string, now: Date): ResolvedRange | null => {
  if (mode === 'none') return null;
  const startKey = localDateKey(range.start, tz);
  const endKey = localDateKey(range.end, tz); // the (exclusive) end is a local midnight
  const days = diffDaysKey(endKey, startKey);
  let cmpStartKey: string;
  let cmpEndKey: string;
  if (mode === 'previous_period') {
    cmpStartKey = addDaysKey(startKey, -days);
    cmpEndKey = startKey;
  } else if (mode === 'same_period_last_week') {
    cmpStartKey = addDaysKey(startKey, -7);
    cmpEndKey = addDaysKey(endKey, -7);
  } else {
    cmpStartKey = shiftYearsKey(startKey, -1);
    cmpEndKey = shiftYearsKey(endKey, -1);
  }
  const start = dateKeyToInstant(tz, cmpStartKey);
  const fullEnd = dateKeyToInstant(tz, cmpEndKey);
  const elapsed = Math.max(Math.min(range.end.getTime(), now.getTime()) - range.start.getTime(), 0);
  return { start, end: new Date(Math.min(fullEnd.getTime(), start.getTime() + elapsed)) };
};

export const MAX_HOURLY_RANGE_DAYS = 14;

/** How many business-local calendar days the range touches (a range cut off mid-day counts that day). */
export const rangeDays = (range: ResolvedRange, tz: string): number =>
  Math.max(diffDaysKey(localDateKey(new Date(range.end.getTime() - 1), tz), localDateKey(range.start, tz)) + 1, 0);

export const autoGranularity = (days: number): Granularity => (days <= 2 ? 'hour' : days <= 31 ? 'day' : days <= 120 ? 'week' : 'month');

/** The bucket size to use: the caller's choice, or one picked from the range length. */
export const resolveGranularity = (requested: 'auto' | Granularity, range: ResolvedRange, tz: string): Granularity => {
  const days = rangeDays(range, tz);
  const chosen = requested === 'auto' ? autoGranularity(days) : requested;
  if (chosen === 'hour' && days > MAX_HOURLY_RANGE_DAYS) {
    throw new ServiceError(400, 'INVALID_INPUT', `Hourly detail needs a range of ${MAX_HOURLY_RANGE_DAYS} days or less.`);
  }
  return chosen;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dayLabel = (key: string) => {
  const [, m, d] = parseDateKey(key);
  return `${d} ${MONTHS[m - 1]}`;
};
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

/** The bucket a business-local calendar day rolls up into. (Hours are keyed directly, not via a day.) */
export const bucketKeyOfDay = (dayKey: string, granularity: 'day' | 'week' | 'month'): string =>
  granularity === 'day' ? dayKey : granularity === 'week' ? mondayOfKey(dayKey) : dayKey.slice(0, 7);

export const bucketKeyOfInstant = (date: Date, tz: string, granularity: Granularity): string =>
  granularity === 'hour' ? `${localDateKey(date, tz)}T${pad(localHour(date, tz))}` : bucketKeyOfDay(localDateKey(date, tz), granularity);

/** Every bucket from range.start up to range.end, in order, including empty ones. */
export const bucketsFor = (range: ResolvedRange, tz: string, granularity: Granularity): Bucket[] => {
  if (granularity === 'hour') {
    const multiDay = rangeDays(range, tz) > 1;
    const out: Bucket[] = [];
    const seen = new Set<string>();
    for (let t = range.start.getTime(); t < range.end.getTime(); t += 3_600_000) {
      const d = new Date(t);
      const key = bucketKeyOfInstant(d, tz, 'hour');
      if (seen.has(key)) continue;
      seen.add(key);
      const [y, m, day] = parseDateKey(localDateKey(d, tz));
      const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
      out.push({ key, label: multiDay ? `${weekday} ${hourLabel(localHour(d, tz))}` : hourLabel(localHour(d, tz)), start: d });
    }
    return out;
  }
  const startKey = localDateKey(range.start, tz);
  const days = rangeDays(range, tz);
  const out: Bucket[] = [];
  const index = new Map<string, Bucket>();
  for (let i = 0; i < days; i++) {
    const dayKey = addDaysKey(startKey, i);
    const key = bucketKeyOfDay(dayKey, granularity);
    if (index.has(key)) continue;
    const label =
      granularity === 'day' ? dayLabel(dayKey) : granularity === 'week' ? `Wk of ${dayLabel(dayKey)}` : `${MONTHS[parseDateKey(dayKey)[1] - 1]} ${parseDateKey(dayKey)[0]}`;
    const bucket = { key, label, start: dateKeyToInstant(tz, dayKey) };
    index.set(key, bucket);
    out.push(bucket);
  }
  return out;
};
