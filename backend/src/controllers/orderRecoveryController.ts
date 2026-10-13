import { Request, Response } from 'express';
import { recoverOrders } from '../services/orderRecovery.service';
import { handleServiceError } from '../utils/serviceError';

// Public: a customer who lost their tracking link gets it back after proving their phone number
// with a fresh OTP (or with the session token that OTP earned, on a later visit). All rules live
// in the service.
export const recoverOrdersPublic = async (req: Request, res: Response) => {
  try {
    const { orders, session } = await recoverOrders(req.body ?? {});
    return res.json({ success: true, data: orders, ...(session ? { session } : {}) });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
