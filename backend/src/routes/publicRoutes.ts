import crypto from 'crypto';
import { RequestHandler, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getTableByToken } from '../controllers/tableController';
import { getPublicMenu, getMenuImage } from '../controllers/menuController';
import { createOrder, getPublicOrderById, markOrderPaidByCustomer, cancelOrderByCustomer, requestOrderRefund } from '../controllers/orderController';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Business } from '../models/Business';
import { config } from '../config';
import { getOtpStatus, confirmWidgetToken, requestOtp, confirmOtp, resendOtpRequest } from '../controllers/otp.controller';
import { recoverOrdersPublic } from '../controllers/orderRecoveryController';
import { readRecoveryToken } from '../utils/recoveryToken';
import { submitDemoRequestPublic } from '../controllers/demoRequestController';
import { createTicketPublic, getTicketStatusPublic, getCallAgentPublic } from '../controllers/supportController';
import {
  startCheckoutPublic,
  getCheckoutPublic,
  retryCheckoutPublic,
  switchCheckoutPublic,
  checkoutCallbackRedirect,
  checkoutCallbackWebhook
} from '../controllers/checkoutController';
import { isCheckoutAvailable } from '../services/checkout.service';

const router = Router();

// In live mode the MSG91 widget itself owns send/verify rate-limiting (that's what the widget
// token buys us) — this just guards our lightweight endpoints (status, token-confirm, and the
// mock-mode request/verify/resend used for local dev) from being hammered directly.
const otpRouteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests from this device. Please try again later.' } }
});

// Public: Resolve QR code token to Business & Table info
router.get('/t/:token', getTableByToken);

// Public: Fetch Business info and menu by slug
router.get('/c/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const business = await Business.findOne({ slug: slug.toLowerCase(), status: 'ACTIVE' });
    if (!business) {
      return res
        .status(404)
        .json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Business not found or inactive.' },
        });
    }
    // checkoutAvailable: whether the menu should offer SMEPay online checkout. Credentials live
    // in SmepayAccount, never on this document.
    return res.json({ success: true, data: { ...business.toJSON(), checkoutAvailable: isCheckoutAvailable(business) } });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/c/:businessId/menu', getPublicMenu);

// Public: Serve an uploaded menu image (<img> tags can't send auth headers)
router.get('/images/:id', getMenuImage);

// Public: "find my order". It hands back order links for a phone number, so it has its own tight
// limiter on top of the OTP it requires (a guesser can't brute-force the code through it).
const recoverRouteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 15 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again in a few minutes.' } }
});

// A customer's saved "my orders" session refreshes its list now and then. Counting that against the
// per-IP limit would lock out a café full of customers on one Wi-Fi address, so a genuine session
// token is limited per token instead. Anything else (no token, an expired or forged one) still
// takes the tight per-IP limit above, so spraying made-up tokens never earns the roomier one.
const recoverSessionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => crypto.createHash('sha256').update(String(req.body?.recoveryToken)).digest('hex'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many refreshes. Please try again in a few minutes.' } }
});
const recoverLimiter: RequestHandler = (req, res, next) =>
  (readRecoveryToken(req.body?.recoveryToken) ? recoverSessionLimiter : recoverRouteLimiter)(req, res, next);

// Public: Order endpoints
router.post('/orders/recover', recoverLimiter, recoverOrdersPublic);
router.post('/orders', createOrder);
router.get('/orders/:id', getPublicOrderById);
router.put('/orders/:id/mark-paid', markOrderPaidByCustomer);
router.put('/orders/:id/cancel', cancelOrderByCustomer);
router.put('/orders/:id/request-refund', requestOrderRefund);

// Public: SMEPay online checkout (services/checkout.service.ts). The order is only created once
// SMEPay confirms payment; until then the customer holds a checkout session. Each write can open
// a paid SMEPay order, so they get their own limiter; status polling rides the default one.
const checkoutRouteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many payment attempts. Please try again later.' } }
});

router.post('/checkout', checkoutRouteLimiter, startCheckoutPublic);
router.get('/checkout/:id', getCheckoutPublic);
router.post('/checkout/:id/retry', checkoutRouteLimiter, retryCheckoutPublic);
router.post('/checkout/:id/switch', checkoutRouteLimiter, switchCheckoutPublic);
// Every SMEPay order's callback_url: the browser redirect after paying (GET) and the webhook (POST).
router.get('/checkout/:id/callback', checkoutCallbackRedirect);
router.post('/checkout/:id/callback', checkoutCallbackWebhook);

// Public: Subscription plans for marketing page
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ status: 'ACTIVE' });
    return res.json({ success: true, data: plans });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/otp/status', otpRouteLimiter, getOtpStatus);
router.post('/otp/confirm-token', otpRouteLimiter, confirmWidgetToken);

// Mock-mode only (see otp.controller.ts) — the widget replaces these in live mode.
router.post('/otp/request', otpRouteLimiter, requestOtp);
router.post('/otp/verify', otpRouteLimiter, confirmOtp);
router.post('/otp/resend', otpRouteLimiter, resendOtpRequest);

// Public: Support widget (consumer-facing floating chat button) — no auth, kept away from
// the free-for-all default limiter so a bad actor can't spam the ticket queue.
const supportRouteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } }
});

router.post('/support/tickets', supportRouteLimiter, createTicketPublic);
router.get('/support/tickets/:ticketNumber/status', supportRouteLimiter, getTicketStatusPublic);
router.get('/support/call-agent', supportRouteLimiter, getCallAgentPublic);

// Public: marketing-site "Request a demo / free trial" form. Tight limiter — this is an open
// write endpoint, so keep one device from flooding the Super Admin lead list.
const demoRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in a few minutes.' } }
});

router.post('/demo-requests', demoRequestLimiter, submitDemoRequestPublic);

export default router;
