// Public café-identity endpoints for order extras and measurement: adding dishes to an order
// already placed (the amend flow, services/orderAmendment.service.ts) and the fire-and-forget
// engagement events (services/identityEvents.service.ts). Orders are looked up by Mongo _id only.
import { Request, Response } from 'express';
import { amendOrder } from '../services/orderAmendment.service';
import { recordEvent, isIdentityEventKind } from '../services/identityEvents.service';
import { Order } from '../models/Order';
import { ServiceError } from '../utils/serviceError';
import { handleServiceError } from '../utils/serviceError';

// POST /public/orders/:id/add-items  body { items: [{ productId, quantity }], source: 'pairing' },
// header X-Guest-Token. Returns the updated order, without the phone number.
export const addItemsToOrderPublic = async (req: Request, res: Response) => {
  try {
    const order = await amendOrder({
      orderId: req.params.id,
      guestPass: req.get('x-guest-token'),
      items: req.body?.items,
      source: req.body?.source
    });
    const { customerPhone: _phone, ...publicOrder } = order.toJSON() as unknown as Record<string, unknown>;
    return res.json({ success: true, message: 'Added to your order.', data: publicOrder });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

const OBJECT_ID = /^[0-9a-f]{24}$/i;

// POST /public/identity-events  body { businessId, kind, orderId? }. Fire-and-forget: 202 whether
// or not the event was kept (it is dropped when identity is off). An orderId is kept only when it
// is an order of that café. An unknown kind is a 400.
export const recordIdentityEventPublic = async (req: Request, res: Response) => {
  try {
    const { businessId, kind, orderId } = req.body ?? {};
    if (!isIdentityEventKind(kind)) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'Unknown event kind.');
    }
    if (typeof businessId !== 'string' || !OBJECT_ID.test(businessId)) {
      throw new ServiceError(400, 'VALIDATION_ERROR', 'A valid businessId is required.');
    }
    const meta: Record<string, string> = {};
    if (typeof orderId === 'string' && OBJECT_ID.test(orderId) && (await Order.exists({ _id: orderId, businessId }))) {
      meta.orderId = orderId;
    }
    await recordEvent(businessId, kind, meta);
    return res.status(202).json({ success: true });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
