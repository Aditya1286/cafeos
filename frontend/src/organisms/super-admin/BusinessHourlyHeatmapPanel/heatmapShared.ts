import { BusinessHeatmapCell } from '@/types';

// $dayOfWeek convention: 1 = Sunday ... 7 = Saturday.
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const HOURS = Array.from({ length: 24 }, (_, h) => h);

export const intensityClass = (intensity: number) =>
  intensity >= 9
    ? 'bg-red-500'
    : intensity >= 7
    ? 'bg-red-400'
    : intensity >= 5
    ? 'bg-red-200'
    : intensity >= 2
    ? 'bg-red-100'
    : 'bg-slate-100';

/** What both heatmap views need: a (day, hour) lookup and the peak value to scale intensity by. */
export interface HeatmapGridProps {
  cellByKey: Map<string, BusinessHeatmapCell>;
  maxRevenuePaise: number;
}

export const cellFor = ({ cellByKey, maxRevenuePaise }: HeatmapGridProps, day: number, hour: number) => {
  const cell = cellByKey.get(`${day}-${hour}`);
  const revenuePaise = cell?.revenuePaise || 0;
  const orders = cell?.orders || 0;
  return { revenuePaise, orders, intensity: Math.round((revenuePaise / maxRevenuePaise) * 10) };
};

export const formatRupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
