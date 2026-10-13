import { Order } from '../models/Order';
import { OrderScope, orderFactsStages } from './analytics.dao';

// Overview queries: where sales come from, and when.

/** Totals grouped by an order field ('source' or 'paymentMethod'); orders missing the field group under 'UNKNOWN'. */
export const totalsByField = async (s: OrderScope, field: 'source' | 'paymentMethod'): Promise<{ key: string; sales: number; orders: number }[]> => {
  const rows = await Order.aggregate([
    ...orderFactsStages(s),
    { $group: { _id: `$${field}`, sales: { $sum: '$sales' }, orders: { $sum: 1 } } },
    { $sort: { sales: -1 } },
  ]);
  return rows.map((r) => ({ key: (r._id as string | null) ?? 'UNKNOWN', sales: r.sales, orders: r.orders }));
};

/** Totals per business-local hour of the day (0–23), across the whole range. */
export const totalsByHour = async (s: OrderScope): Promise<{ hour: number; sales: number; orders: number }[]> => {
  const rows = await Order.aggregate([
    ...orderFactsStages(s),
    { $group: { _id: { $hour: { date: '$createdAt', timezone: s.timezone } }, sales: { $sum: '$sales' }, orders: { $sum: 1 } } },
  ]);
  return rows.map((r) => ({ hour: r._id as number, sales: r.sales, orders: r.orders }));
};

/** Orders and sales per (day of week, hour), in business-local time. `dow` follows Mongo: 1 = Sunday … 7 = Saturday. */
export const heatmapCells = async (s: OrderScope): Promise<{ dow: number; hour: number; orders: number; sales: number }[]> => {
  const rows = await Order.aggregate([
    ...orderFactsStages(s),
    {
      $group: {
        _id: { dow: { $dayOfWeek: { date: '$createdAt', timezone: s.timezone } }, hour: { $hour: { date: '$createdAt', timezone: s.timezone } } },
        sales: { $sum: '$sales' },
        orders: { $sum: 1 },
      },
    },
  ]);
  return rows.map((r) => ({ dow: r._id.dow as number, hour: r._id.hour as number, orders: r.orders, sales: r.sales }));
};
