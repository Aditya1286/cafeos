import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { handleServiceError } from '../utils/serviceError';
import { Order } from '../models/Order';
import { welcomeFor } from '../services/welcome.service';
import { isIdentityOnFor } from '../services/cafeIdentity.service';
import { pairingsFor } from '../services/pairings.service';
import { questionFor, answerQuestion } from '../services/dailyQuestion.service';

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

// Orders are looked up by their Mongo _id only (the public-order rule in orderController).
const findOrderByPublicId = (id: unknown) =>
  typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id) ? Order.findById(id) : Promise.resolve(null);

const orderNotFound = (res: Response) =>
  res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });

const WAITING_STATUSES = ['PLACED', 'PREPARING'];

// GET /public/orders/:id/while-you-wait: pairings and the daily question, while the order is
// PLACED or PREPARING and identity is on for its café; otherwise empty.
export const getWhileYouWait = async (req: Request, res: Response) => {
  try {
    const order = await findOrderByPublicId(req.params.id);
    if (!order) return orderNotFound(res);
    const business = await Business.findById(order.businessId).select('identity');
    if (!isIdentityOnFor(business) || !WAITING_STATUSES.includes(order.orderStatus)) {
      return res.json({ success: true, data: { pairings: [], question: null } });
    }
    // Each block is optional: one failing leaves the other (and the tracker) working.
    const [pairings, question] = await Promise.all([
      pairingsFor(order).catch((err) => {
        console.error('[identity] Pairings failed:', err);
        return [];
      }),
      questionFor(order).catch((err) => {
        console.error('[identity] Daily question failed:', err);
        return null;
      })
    ]);
    return res.json({ success: true, data: { pairings, question } });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// POST /public/orders/:id/answer (X-Guest-Token), body { questionId, optionId } → { reply, gesture }.
export const postAnswer = async (req: Request, res: Response) => {
  try {
    const order = await findOrderByPublicId(req.params.id);
    if (!order) return orderNotFound(res);
    const business = await Business.findById(order.businessId).select('identity');
    if (!isIdentityOnFor(business)) {
      return res.status(403).json({ success: false, error: { code: 'IDENTITY_OFF', message: 'This café has no daily question.' } });
    }
    const data = await answerQuestion(order, req.get('X-Guest-Token'), req.body?.questionId, req.body?.optionId);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
