import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const enforceBusiness = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    // Super admins are global, but if a header or query specifies a target business, we attach it
    if (req.headers['x-business-id']) {
      req.businessId = req.headers['x-business-id'] as any;
    }
    return next();
  }

  if (!req.businessId) {
    return res.status(403).json({
      success: false,
      error: { code: 'BUSINESS_REQUIRED', message: 'Business context is missing or invalid for this operation.' }
    });
  }

  next();
};
