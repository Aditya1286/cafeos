import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { serviceHandler } from '../utils/serviceHandler';
import { ServiceError } from '../utils/serviceError';
import { demoConfig, isDemoEnabled } from './demo.config';
import { runDemoTick, TickInProgressError } from './tick';
import { getDemoStatus } from './status';

// The demo endpoints are for the operator's cron job, not for users: they need the X-Demo-Key
// header to match DEMO_TICK_KEY, and don't exist at all (404) while no key is configured.
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
