import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { DailyOrderCounter } from '../models/DailyOrderCounter';
import { Remittance } from '../models/Remittance';
import { CafeContext } from './provision';
import { DemoOrderPlan } from './models/DemoOrderPlan';
import { demoConfig } from './demo.config';
import { startOfLocalDay, localTime, DAY_MS } from './clock';

// Keeps a demo café's data from growing forever (the database is a 512 MB Atlas free cluster): once
// a day, everything older than DEMO_KEEP_DAYS goes — orders with their ledger rows and kitchen
// plans, fee periods with their settlement rows, and daily order counters. Every dashboard window
// (today, this week vs last week, 30-day popular items and kitchen speed) stays fully covered.
//
// The cut is moved back to the start of the billing period it falls in, so a fee period is either
// kept whole or removed whole: the remittance service recomputes periods from the orders, and a
// half-pruned period would come back with a smaller total than the one already paid.

const PRUNE_EVERY_MS = DAY_MS;
const BATCH = 5000;
// Finished kitchen plans are only bookkeeping; keep a couple of days for debugging.
const KEEP_DONE_PLANS_MS = 2 * DAY_MS;

export interface PruneResult {
  orders: number;
  ledgerRows: number;
  feePeriods: number;
}

export const pruneOldDemoData = async (ctx: CafeContext, now: Date, options: { force?: boolean; keepDays?: number } = {}): Promise<PruneResult> => {
  const { business, state } = ctx;
  const result: PruneResult = { orders: 0, ledgerRows: 0, feePeriods: 0 };
  if (!options.force && state.lastPrunedAt && now.getTime() - state.lastPrunedAt.getTime() < PRUNE_EVERY_MS) return result;

  const keepDays = options.keepDays ?? demoConfig().keepDays;
  let cutoff = startOfLocalDay(new Date(now.getTime() - keepDays * DAY_MS));
  const straddling = await Remittance.findOne({ businessId: business._id, periodStart: { $lte: cutoff }, periodEnd: { $gt: cutoff } });
  if (straddling) cutoff = straddling.periodStart;

  // Orders, in batches, with the ledger rows and kitchen plans that belong to them.
  for (;;) {
    const ids = (await Order.find({ businessId: business._id, createdAt: { $lt: cutoff } }).select('_id').limit(BATCH).lean()).map((o) => o._id);
    if (!ids.length) break;
    result.ledgerRows += (await FinancialLedger.deleteMany({ businessId: business._id, orderId: { $in: ids } })).deletedCount;
    await DemoOrderPlan.deleteMany({ orderId: { $in: ids } });
    result.orders += (await Order.deleteMany({ _id: { $in: ids } })).deletedCount;
  }

  // Fee periods before the cut, with the settlement rows that paid them.
  const periods = (await Remittance.find({ businessId: business._id, periodStart: { $lt: cutoff } }).select('_id').lean()).map((r) => r._id);
  if (periods.length) {
    result.ledgerRows += (
      await FinancialLedger.deleteMany({ businessId: business._id, type: 'BUSINESS_SETTLEMENT', 'metadata.remittanceId': { $in: periods } })
    ).deletedCount;
    result.feePeriods = (await Remittance.deleteMany({ _id: { $in: periods } })).deletedCount;
  }

  await DailyOrderCounter.deleteMany({ businessId: business._id, dateKey: { $lt: localTime(cutoff).dateKey } });
  await DemoOrderPlan.deleteMany({ businessId: business._id, done: true, updatedAt: { $lt: new Date(now.getTime() - KEEP_DONE_PLANS_MS) } });

  state.lastPrunedAt = now;
  await state.save();
  return result;
};
