import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { runAnalyticsQuery } from '../services/analytics/service';
import { handleServiceError } from '../utils/serviceError';

// The owner analytics screen asks for the metrics of one view in a single request. All the rules
// (filters, ranges, metric definitions) live in services/analytics.
const asObjectId = (value: unknown): mongoose.Types.ObjectId | null => {
  const text = String(value ?? '');
  return /^[0-9a-f]{24}$/i.test(text) ? new mongoose.Types.ObjectId(text) : null;
};

export const queryAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // A super admin names the business per request (x-business-id); anything else is the user's own.
    const businessId = asObjectId(req.businessId);
    if (!businessId) {
      return res.status(400).json({ success: false, error: { code: 'BUSINESS_REQUIRED', message: 'Business context is missing or invalid for this operation.' } });
    }
    const result = await runAnalyticsQuery({ businessId, body: req.body });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
