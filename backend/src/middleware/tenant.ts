import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const enforceTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    // Super admins are global, but if a header or query specifies a target tenant, we attach it
    if (req.headers['x-tenant-id']) {
      req.tenantId = req.headers['x-tenant-id'] as any;
    }
    return next();
  }

  if (!req.tenantId) {
    return res.status(403).json({
      success: false,
      error: { code: 'TENANT_REQUIRED', message: 'Tenant context is missing or invalid for this operation.' }
    });
  }

  next();
};
