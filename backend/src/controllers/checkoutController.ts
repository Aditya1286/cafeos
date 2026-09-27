import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { handleServiceError } from '../utils/serviceError';
import * as checkoutService from '../services/checkout.service';
import * as checkoutSettingsService from '../services/checkoutSettings.service';

// ── Public (customer) — sessions are addressed by their Mongo _id only ─────

export const startCheckoutPublic = async (req: Request, res: Response) => {
  try {
    const { qrToken, businessSlug, customerName, customerPhone, items, notes } = req.body;
    const data = await checkoutService.startCheckout({ qrToken, businessSlug, customerName, customerPhone, items, notes });
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const getCheckoutPublic = async (req: Request, res: Response) => {
  try {
    const data = await checkoutService.getCheckoutStatus(req.params.id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// SMEPay's callback_url, GET side: the customer's browser after paying → their checkout page.
export const checkoutCallbackRedirect = async (req: Request, res: Response) => {
  try {
    return res.redirect(302, await checkoutService.getCheckoutReturnUrl(req.params.id));
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// SMEPay's callback_url, POST side: the webhook. Answered 200 straight away as SMEPay asks (it
// retries only on 5xx/timeouts); the check it triggers runs afterwards and logs its own errors.
export const checkoutCallbackWebhook = async (req: Request, res: Response) => {
  void checkoutService.handlePaymentWebhook(req.params.id);
  return res.json({ success: true });
};

export const retryCheckoutPublic = async (req: Request, res: Response) => {
  try {
    const data = await checkoutService.retryCheckout(req.params.id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const switchCheckoutPublic = async (req: Request, res: Response) => {
  try {
    const data = await checkoutService.switchPaymentMethod(req.params.id, req.body?.paymentMethod);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// ── Owner ──────────────────────────────────────────────────────────────────

export const getMyCheckoutSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = await checkoutSettingsService.getCheckoutSettings(req.businessId!);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const startMyCheckoutOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const data = await checkoutSettingsService.startOnboarding(req.businessId!, req.user!);
    return res.json({ success: true, message: 'SMEPay account created. Complete KYC to continue.', data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const saveMyCheckoutCredentials = async (req: AuthRequest, res: Response) => {
  try {
    const data = await checkoutSettingsService.saveCredentials(req.businessId!, req.body || {});
    return res.json({ success: true, message: 'SMEPay account connected.', data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const setMyCheckoutEnabled = async (req: AuthRequest, res: Response) => {
  try {
    const data = await checkoutSettingsService.setCheckoutEnabled(req.businessId!, req.body?.enabled);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

// ── Super Admin ────────────────────────────────────────────────────────────

export const setBusinessCheckoutAllowed = async (req: AuthRequest, res: Response) => {
  try {
    const data = await checkoutSettingsService.setCheckoutAllowed(req.params.id, req.body?.allowed);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};

export const getBusinessCheckoutSettings = async (req: AuthRequest, res: Response) => {
  try {
    const data = await checkoutSettingsService.getCheckoutSettings(req.params.id);
    return res.json({ success: true, data });
  } catch (error: any) {
    return handleServiceError(res, error);
  }
};
