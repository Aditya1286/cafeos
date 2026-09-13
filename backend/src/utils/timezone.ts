/**
 * Timezone-aware day boundary helpers, used so "today" / "this week" metrics
 * line up with the same business-local calendar day used to mint orderId
 * sequences (see utils/orderSequence.ts) rather than the server's UTC day.
 */

/**
 * Returns the UTC instant that corresponds to 00:00:00 local time, in `timezone`,
 * on the local calendar day containing `referenceDate`.
 */
export const startOfLocalDay = (timezone: string, referenceDate: Date = new Date()): Date => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(referenceDate);

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);

  // Treat the local wall-clock reading as if it were UTC — the gap between
  // that and the real instant is exactly the timezone's current offset.
  const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offsetMs = localAsUtc - referenceDate.getTime();

  const localMidnightAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), 0, 0, 0);
  return new Date(localMidnightAsUtc - offsetMs);
};

export const getBusinessDayRange = (timezone: string, referenceDate: Date = new Date()) => {
  const start = startOfLocalDay(timezone, referenceDate);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

/** [start-N*24h, start) relative to today's local midnight — a trailing N-day window ending today. */
export const getTrailingDayRange = (timezone: string, days: number, referenceDate: Date = new Date()) => {
  const { start: todayStart } = getBusinessDayRange(timezone, referenceDate);
  const start = new Date(todayStart.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end: todayStart };
};
