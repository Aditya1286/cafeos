// Bangalore local time for the demo cafés (all in Asia/Kolkata, which has no daylight saving, so
// a fixed +05:30 offset is exact).
export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;
const IST_OFFSET_MS = 330 * MINUTE_MS;

export interface LocalTime {
  dateKey: string; // "YYYY-MM-DD", as DailyOrderCounter stores it
  ddmmyy: string; // as in order numbers, e.g. LCR-011026-0001
  hour: number;
  minuteOfDay: number;
  weekday: number; // 0 = Sunday
}

export const localTime = (at: Date): LocalTime => {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  const iso = shifted.toISOString();
  const dateKey = iso.slice(0, 10);
  return {
    dateKey,
    ddmmyy: `${dateKey.slice(8, 10)}${dateKey.slice(5, 7)}${dateKey.slice(2, 4)}`,
    hour: shifted.getUTCHours(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay()
  };
};

export const startOfLocalDay = (at: Date): Date =>
  new Date(Math.floor((at.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS);

export const nextLocalMidnight = (at: Date): Date => new Date(startOfLocalDay(at).getTime() + DAY_MS);

// "06:30" -> 390
export const minutesOf = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};
