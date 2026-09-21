import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getTableByToken } from '../controllers/tableController';
import { getPublicMenu, getMenuImage } from '../controllers/menuController';
import { createOrder, getOrderById, markOrderPaidByCustomer, cancelOrderByCustomer, requestOrderRefund } from '../controllers/orderController';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Business } from '../models/Business';
import { getOtpStatus, confirmWidgetToken, requestOtp, confirmOtp, resendOtpRequest } from '../controllers/otp.controller';
import { createTicketPublic, getTicketStatusPublic, getCallAgentPublic } from '../controllers/supportController';

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
    return res.json({ success: true, data: business });
  } catch (error: any) {
    return res
      .status(500)
      .json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/c/:businessId/menu', getPublicMenu);

// Public: Serve an uploaded menu image (<img> tags can't send auth headers)
router.get('/images/:id', getMenuImage);

// Public: Order endpoints
router.post('/orders', createOrder);
router.get('/orders/:id', getOrderById);
router.put('/orders/:id/mark-paid', markOrderPaidByCustomer);
router.put('/orders/:id/cancel', cancelOrderByCustomer);
router.put('/orders/:id/request-refund', requestOrderRefund);

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

export default router;
