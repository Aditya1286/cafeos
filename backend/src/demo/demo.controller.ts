import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { serviceHandler } from '../utils/serviceHandler';
import { ServiceError } from '../utils/serviceError';
import { demoConfig, isDemoEnabled } from './demo.config';
import { runDemoTick, TickInProgressError } from './tick';
import { runDemoPulse, clearDemoPulse } from './pulse';
import { getDemoStatus } from './status';

// The demo endpoints are for the operator's cron job, not for users: they need the X-Demo-Key
// header to match demo.tickKey, and don't exist at all (404) while no key is configured.
export const requireDemoKey = (req: Request, res: Response, next: NextFunction) => {
  if (!isDemoEnabled()) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found.' } });
  }
  const given = Buffer.from(String(req.headers['x-demo-key'] || ''));
  const expected = Buffer.from(demoConfig().tickKey);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or wrong X-Demo-Key.' } });
  }
  next();
};

export const tick = serviceHandler(async () => {
  try {
    return await runDemoTick();
  } catch (error) {
    if (error instanceof TickInProgressError) throw new ServiceError(409, 'TICK_IN_PROGRESS', error.message);
    throw error;
  }
});

export const status = serviceHandler(() => getDemoStatus());

// One new order at the demo café and a nudge for the kitchen: for a loop that calls it every ~30 s
// while someone is looking at the demo (see ./README.md).
export const clearPulse = serviceHandler((req: Request) => clearDemoPulse(typeof req.query.slug === 'string' ? req.query.slug : undefined));

export const pulse = serviceHandler(async (req: Request) => {
  try {
    return await runDemoPulse(typeof req.query.slug === 'string' ? req.query.slug : undefined);
  } catch (error) {
    if (error instanceof TickInProgressError) throw new ServiceError(409, 'TICK_IN_PROGRESS', error.message);
    throw error;
  }
});
