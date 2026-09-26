import { Router } from 'express';
import { updateBusinessSettings } from '../controllers/businessController';
import {
  getMyCheckoutSettings,
  startMyCheckoutOnboarding,
  saveMyCheckoutCredentials,
  setMyCheckoutEnabled
} from '../controllers/checkoutController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.put('/settings', restrictTo('OWNER'), updateBusinessSettings);

// SMEPay online checkout setup (services/checkoutSettings.service.ts)
router.get('/checkout', restrictTo('OWNER'), getMyCheckoutSettings);
router.post('/checkout/onboard', restrictTo('OWNER'), startMyCheckoutOnboarding);
router.put('/checkout/credentials', restrictTo('OWNER'), saveMyCheckoutCredentials);
router.put('/checkout/enabled', restrictTo('OWNER'), setMyCheckoutEnabled);

export default router;
