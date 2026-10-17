import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { handleServiceError } from '../utils/serviceError';
import { welcomeFor } from '../services/welcome.service';

// Café identity: the guest-facing extras (spec §8.1, §9). Each one is quiet when identity is off,
// and none of them ever returns a phone number.

const findActiveBusiness = (id: unknown) =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) ? Business.findOne({ _id: id, status: 'ACTIVE' }) : Promise.resolve(null);

// GET /public/c/:businessId/welcome (X-Guest-Token): the returning-guest line, or 204 when there
// is none to give (no pass, a pass for another café, identity off, nothing remembered).
export const getWelcome = async (req: Request, res: Response) => {
  try {
    const business = await findActiveBusiness(req.params.businessId);
    const welcome = business ? await welcomeFor(business, req.get('X-Guest-Token')) : null;
    if (!welcome) return res.status(204).end();
    return res.json({ success: true, data: welcome });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
