import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { handleServiceError } from '../utils/serviceError';
import * as cafeIdentityService from '../services/cafeIdentity.service';
import { identitySummary } from '../services/identityEvents.service';

// Thin handlers: the rules (the gate, the theme allow-list, the house special cap) live in
// services/cafeIdentity.service.ts and surface here as ServiceError.

// Owner: save the café's look (theme, variant, tagline).
export const updateMyIdentity = async (req: AuthRequest, res: Response) => {
  try {
    const { themeId, variantId, tagline } = req.body ?? {};
    const data = await cafeIdentityService.updateOwnerIdentity(req.businessId!.toString(), { themeId, variantId, tagline });
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// Super admin: switch a café's identity on or off, and set or clear its theme.
export const setBusinessIdentityAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { enabled, themeId, variantId } = req.body ?? {};
    const data = await cafeIdentityService.adminSetIdentity(req.params.id, { enabled, themeId, variantId });
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// Owner / manager: mark a dish as a house special, or unmark it.
export const setProductHouseSpecial = async (req: AuthRequest, res: Response) => {
  try {
    const data = await cafeIdentityService.setHouseSpecial(req.businessId!.toString(), req.params.id, req.body?.on);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// Super admin: the café identity readout (return rate before/after, adoption, event counts).
export const getIdentitySummaryAdmin = async (_req: AuthRequest, res: Response) => {
  try {
    return res.json({ success: true, data: await identitySummary() });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
