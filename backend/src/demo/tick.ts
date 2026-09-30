import { DEMO_CAFES } from './cafes';
import { DemoSimState } from './models/DemoSimState';
import { provisionCafe, CafeContext } from './provision';
import { demoConfig } from './demo.config';
import { writeHistory } from './history';
import { placeLiveOrder, advanceLivePlans } from './live';
import { settleDueFees } from './fees';
import { pruneOldDemoData, PruneResult } from './prune';
import { arrivalsBetween } from './demand';
import { startOfLocalDay, nextLocalMidnight, DAY_MS, MINUTE_MS } from './clock';

// One round of the demo café simulation — what POST /api/v1/demo/tick (and the CLI) runs:
//
//  1. make sure every demo café exists, with its logins, tables and menu;
//  2. fill in order history up to 45 minutes ago, a day at a time, in past time (a new café gets
//     DEMO_BACKFILL_DAYS of it; after a gap — laptop asleep — the missed stretch is filled the same
//     way, so charts never have holes);
//  3. turn the arrivals of the last 45 minutes into live orders through the real order API;
//  4. move live orders along in the kitchen (accept, cook, ready, complete) as their times come;
//  5. keep the cafés' platform fees paid;
//  6. once a day, prune data older than DEMO_KEEP_DAYS (the database is a 512 MB free cluster).
//
// History that doesn't fit in `budgetMs` carries over to the next tick; live orders only start
// once a café's history has caught up.

// Arrivals newer than this become live orders; anything older is written as history. Longer than
// any order takes, so history never contains an order that would still be in the kitchen.
const LIVE_WINDOW_MS = 45 * MINUTE_MS;
// After a long gap, don't flood the kitchen: at most this many live orders per café per tick.
const MAX_LIVE_ORDERS_PER_TICK = 10;
const LOCK_KEY = 'lock';

export interface CafeTickSummary {
  slug: string;
  name: string;
  status: 'ok' | 'skipped';
  reason?: string;
  created?: boolean;
  historyOrders: number;
  liveOrders: number;
  feesSettled: number;
  pruned?: PruneResult;
  simulatedUntil?: Date;
  caughtUp: boolean;
}

export interface TickSummary {
  ranAt: Date;
  tookMs: number;
  cafes: CafeTickSummary[];
  kitchenSteps: number;
  caughtUp: boolean;
}

export class TickInProgressError extends Error {}

const acquireLock = async (holdMs: number) => {
  const now = new Date();
  try {
    const lock = await DemoSimState.findOneAndUpdate(
      { key: LOCK_KEY, $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lte: now } }] },
      { $set: { lockedUntil: new Date(now.getTime() + holdMs) } },
      { upsert: true, new: true }
    );
    return !!lock;
  } catch (err: any) {
    // Upserting a second "lock" document fails on the unique key: someone else holds it.
    if (err.code === 11000) return false;
    throw err;
  }
};

const releaseLock = () => DemoSimState.updateOne({ key: LOCK_KEY }, { $set: { lockedUntil: new Date(0) } });

export const runDemoTick = async (options: { now?: Date; budgetMs?: number; historyOnly?: boolean } = {}): Promise<TickSummary> => {
  const started = Date.now();
  const now = options.now || new Date();
  const budgetMs = options.budgetMs ?? 20_000;
  if (!(await acquireLock(budgetMs + 5 * 60_000))) throw new TickInProgressError('Another demo tick is still running.');

  try {
    const historyEnd = new Date(now.getTime() - LIVE_WINDOW_MS);
    const summaries: CafeTickSummary[] = [];
    const contexts: { ctx: CafeContext; summary: CafeTickSummary }[] = [];

    // 1. Set-up.
    for (const cafe of DEMO_CAFES) {
      const base = { slug: cafe.slug, name: cafe.name, historyOrders: 0, liveOrders: 0, feesSettled: 0, caughtUp: false };
      const result = await provisionCafe(cafe);
      if (!result.ok) {
        summaries.push({ ...base, status: 'skipped', reason: result.reason });
        continue;
      }
      const { ctx } = result;
      if (!ctx.state.simulatedUntil) {
        ctx.state.simulatedUntil = startOfLocalDay(new Date(now.getTime() - demoConfig().backfillDays * DAY_MS));
        await ctx.state.save();
      }
      const summary: CafeTickSummary = { ...base, status: 'ok', created: result.created };
      summaries.push(summary);
      contexts.push({ ctx, summary });
    }

    // 2. History, a Bangalore day per café per turn so all cafés fill in evenly.
    let behind = contexts.filter(({ ctx }) => ctx.state.simulatedUntil! < historyEnd);
    while (behind.length && Date.now() - started < budgetMs) {
      for (const { ctx, summary } of behind) {
        const from = ctx.state.simulatedUntil!;
        const to = new Date(Math.min(historyEnd.getTime(), nextLocalMidnight(from).getTime()));
        summary.historyOrders += await writeHistory(ctx, arrivalsBetween(ctx.cafe, from, to), now);
        ctx.state.simulatedUntil = to;
        await ctx.state.save();
        if (Date.now() - started >= budgetMs) break;
      }
      behind = behind.filter(({ ctx }) => ctx.state.simulatedUntil! < historyEnd);
    }

    for (const { ctx, summary } of contexts) {
      const caughtUp = ctx.state.simulatedUntil! >= historyEnd;
      // 3. Live orders, once this café's history has caught up.
      if (caughtUp && !options.historyOnly) {
        const arrivals = arrivalsBetween(ctx.cafe, ctx.state.simulatedUntil!, now).slice(0, MAX_LIVE_ORDERS_PER_TICK);
        for (let i = 0; i < arrivals.length; i++) {
          if (await placeLiveOrder(ctx, now).catch((err) => (console.warn(`[demo] ${ctx.cafe.slug}: ${err?.message}`), false))) {
            summary.liveOrders++;
          }
        }
        ctx.state.simulatedUntil = now;
        await ctx.state.save();
      }
      // 5. Fees. 6. Pruning.
      summary.feesSettled = await settleDueFees(ctx, now);
      summary.pruned = await pruneOldDemoData(ctx, now);
      summary.simulatedUntil = ctx.state.simulatedUntil;
      summary.caughtUp = ctx.state.simulatedUntil! >= historyEnd;
    }

    // 4. Kitchen.
    const kitchenSteps = options.historyOnly ? 0 : await advanceLivePlans(now, contexts.map(({ ctx }) => ctx.business._id.toString()));

    return {
      ranAt: now,
      tookMs: Date.now() - started,
      cafes: summaries,
      kitchenSteps,
      caughtUp: summaries.every((s) => s.status === 'skipped' || s.caughtUp)
    };
  } finally {
    await releaseLock();
  }
};
