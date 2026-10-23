import { Request, Response } from 'express';
import * as siteAnalyticsService from '../services/siteAnalytics.service';
import { handleServiceError } from '../utils/serviceError';

// ── Public (the marketing site's own page-view / demo-quiz beacon) ─────────

// Sent with navigator.sendBeacon, which ignores the reply, so success is an empty 204.
export const recordSiteEventPublic = async (req: Request, res: Response) => {
  try {
    await siteAnalyticsService.recordEvent(req.body || {}, req.get('user-agent') || '');
    return res.status(204).end();
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// ── Super Admin ────────────────────────────────────────────────────────────

export const getSiteReportAdmin = async (req: Request, res: Response) => {
  try {
    const range = typeof req.query.range === 'string' ? req.query.range : 'last_7_days';
    const report = await siteAnalyticsService.getReport(range);
    return res.json({ success: true, data: report });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
