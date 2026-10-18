import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { PULSE_KEY_PREFIX } from './live';
import { DemoOrderPlan } from './models/DemoOrderPlan';

// Anyone can order at the public demo café, with their own phone number (it is verified by OTP like
// at any café). So a few hours later those orders go, with their ledger rows, and with them the
// name and number the visitor typed. (The fees and remittance screens are switched off, see
// FEES_AND_PAYMENTS_ENABLED on the frontend, so no one is looking at the fee periods they feed.)
// The simulator's own customers all have numbers starting with 5, which no Indian mobile does, so
// whatever does not start with 5 is a real visitor.
const SIMULATED_PHONE = /^5\d{9}$/;
const KEEP_VISITOR_MS = 6 * 60 * 60 * 1000;

export const sweepVisitorOrders = async (businessId: mongoose.Types.ObjectId, now: Date): Promise<number> => {
  const old = { businessId, customerPhone: { $not: SIMULATED_PHONE }, createdAt: { $lt: new Date(now.getTime() - KEEP_VISITOR_MS) } };
  const ids = (await Order.find(old).select('_id').lean()).map((order) => order._id);
  if (!ids.length) return 0;
  await FinancialLedger.deleteMany({ businessId, orderId: { $in: ids } });
  return (await Order.deleteMany({ _id: { $in: ids } })).deletedCount;
};

// Orders from the pulse (see pulse.ts) are for a demo that is happening right now, so they go
// after ten minutes, taking their ledger rows and kitchen plans with them. `maxAgeMs: 0` clears
// them all at once. Orders from the tick are never touched: they are the café's realistic day.
const KEEP_PULSE_MS = 10 * 60 * 1000;

export const sweepPulseOrders = async (businessId: mongoose.Types.ObjectId, now: Date, maxAgeMs: number = KEEP_PULSE_MS): Promise<number> => {
  const old = { businessId, idempotencyKey: { $regex: `^${PULSE_KEY_PREFIX}` }, createdAt: { $lte: new Date(now.getTime() - maxAgeMs) } };
  const ids = (await Order.find(old).select('_id').lean()).map((order) => order._id);
  if (!ids.length) return 0;
  await FinancialLedger.deleteMany({ businessId, orderId: { $in: ids } });
  await DemoOrderPlan.deleteMany({ orderId: { $in: ids } });
  return (await Order.deleteMany({ _id: { $in: ids } })).deletedCount;
};
