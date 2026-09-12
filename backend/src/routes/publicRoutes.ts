import { Router } from 'express';
import { getTableByToken } from '../controllers/tableController';
import { getPublicMenu } from '../controllers/menuController';
import { createOrder, getOrderById } from '../controllers/orderController';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Restaurant } from '../models/Restaurant';

const router = Router();

// Public: Resolve QR code token to Cafe & Table info
router.get('/t/:token', getTableByToken);

// Public: Fetch Cafe info and menu by slug
router.get('/c/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const restaurant = await Restaurant.findOne({ slug: slug.toLowerCase(), status: 'ACTIVE' });
    if (!restaurant) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Café not found or inactive.' } });
    }
    return res.json({ success: true, data: restaurant });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/c/:tenantId/menu', getPublicMenu);

// Public: Order endpoints
router.post('/orders', createOrder);
router.get('/orders/:id', getOrderById);

// Public: Subscription plans for marketing page
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ status: 'ACTIVE' });
    return res.json({ success: true, data: plans });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

export default router;
