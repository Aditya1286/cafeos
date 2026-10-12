import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as demoRequestService from '../services/demoRequest.service';
import { handleServiceError } from '../utils/serviceError';

// ── Public (marketing site form) ───────────────────────────────────────────

export const submitDemoRequestPublic = async (req: Request, res: Response) => {
  try {
    await demoRequestService.submitDemoRequest(req.body || {});
    return res.status(201).json({
      success: true,
      message: "Thanks! We'll call you soon to set up your free trial."
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// ── Super Admin ────────────────────────────────────────────────────────────

const toRow = (r: any) => ({
  id: r._id,
  name: r.name,
  brandName: r.brandName,
  phone: r.phone,
  email: r.email,
  city: r.city,
  businessType: r.businessType,
  message: r.message,
  interestedPlan: r.interestedPlan,
  status: r.status,
  adminNote: r.adminNote,
  contactedAt: r.contactedAt,
  createdAt: r.createdAt
});

export const listDemoRequestsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const result = await demoRequestService.listForAdmin({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 15
    });
    return res.json({
      success: true,
      data: result.requests.map(toRow),
      pagination: result.pagination,
      meta: { newCount: result.newCount }
    });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const updateDemoRequestAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const updated = await demoRequestService.updateForAdmin(req.params.id, String(req.user?._id), {
      status: req.body?.status,
      adminNote: req.body?.adminNote
    });
    return res.json({ success: true, data: toRow(updated) });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
