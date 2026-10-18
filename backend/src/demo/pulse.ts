import { DEMO_CAFES } from './cafes';
import { provisionCafe } from './provision';
import { placeLiveOrder, advanceLivePlans } from './live';
import { acquireLock, releaseLock, TickInProgressError } from './tick';
import { ServiceError } from '../utils/serviceError';
import { Business } from '../models/Business';
import { sweepPulseOrders } from './visitorSweep';

// The simple, order-based demo: each call places one order at one café through the real order API,
// then moves whatever is in the kitchen along. A loop that calls it every 30 seconds gives a demo
// that always has something arriving (the tick still fills in history and does the realistic day).
// It shares the tick's lock, so a pulse never runs on top of a tick.
const DEFAULT_SLUG = 'loamline-coffee';
const HOLD_MS = 60_000;

export const runDemoPulse = async (slug: string = DEFAULT_SLUG, now: Date = new Date()) => {
  const cafe = DEMO_CAFES.find((c) => c.slug === slug);
  if (!cafe) throw new ServiceError(404, 'NOT_FOUND', `No demo café "${slug}".`);
  if (!(await acquireLock(HOLD_MS))) throw new TickInProgressError('A demo tick is running; try again in a moment.');
  try {
    const result = await provisionCafe(cafe);
    if (!result.ok) throw new ServiceError(409, 'DEMO_CAFE_UNAVAILABLE', result.reason);
    const placed = await placeLiveOrder(result.ctx, now, 'pulse');
    await sweepPulseOrders(result.ctx.business._id, now);
    const kitchenSteps = await advanceLivePlans(now, [result.ctx.business._id.toString()]);
    return { slug, placed, kitchenSteps, at: now };
  } finally {
    await releaseLock();
  }
};

/** Deletes every order the pulse has placed at a café (for when a demo is over). */
export const clearDemoPulse = async (slug: string = DEFAULT_SLUG) => {
  const business = DEMO_CAFES.some((c) => c.slug === slug) ? await Business.findOne({ slug, isDemo: true }).select('_id') : null;
  if (!business) throw new ServiceError(404, 'NOT_FOUND', `No demo café "${slug}".`);
  return { slug, deleted: await sweepPulseOrders(business._id, new Date(), 0) };
};
