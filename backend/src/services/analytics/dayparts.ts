import { Daypart } from './types';

const hours = (from: number, to: number): number[] => Array.from({ length: to - from }, (_, i) => from + i);

/** The business-local hours (0–23) that belong to each daypart. Night wraps past midnight. */
export const DAYPART_HOURS: Record<Daypart, number[]> = {
  morning: hours(5, 11),
  afternoon: hours(11, 16),
  evening: hours(16, 21),
  night: [...hours(21, 24), ...hours(0, 5)],
};

export const DAYPART_LABELS: Record<Daypart, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export const daypartOfHour = (hour: number): Daypart => {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 21) return 'evening';
  return 'night';
};

/** Every hour covered by any of the given dayparts, ascending. */
export const hoursForDayparts = (dayparts: Daypart[]): number[] =>
  [...new Set(dayparts.flatMap((d) => DAYPART_HOURS[d]))].sort((a, b) => a - b);
