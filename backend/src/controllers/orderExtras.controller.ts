// Public café-identity endpoints that act on an order already placed: adding dishes to it (the
// amend flow, services/orderAmendment.service.ts). Orders are looked up by Mongo _id only.
import { Request, Response } from 'express';
import { amendOrder } from '../services/orderAmendment.service';
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
