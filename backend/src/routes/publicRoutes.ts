import { Router } from 'express';
import { getTableByToken } from '../controllers/tableController';
import { getPublicMenu, getMenuImage } from '../controllers/menuController';
import { createOrder, getOrderById, markOrderPaidByCustomer, cancelOrderByCustomer } from '../controllers/orderController';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Business } from '../models/Business';
import { confirmOtp, requestOtp } from '../controllers/otp.controller';
import { verifyOtp } from '../services/otp.service';

const router = Router();

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

router.post('/otp/request', requestOtp);
router.post('/otp/verify', confirmOtp);

export default router;
