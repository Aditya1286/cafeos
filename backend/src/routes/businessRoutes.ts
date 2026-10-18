import { Router } from 'express';
import { updateBusinessSettings } from '../controllers/businessController';
import {
  getMyCheckoutSettings,
  startMyCheckoutOnboarding,
  saveMyCheckoutCredentials,
  setMyCheckoutEnabled
} from '../controllers/checkoutController';
import { updateMyIdentity } from '../controllers/cafeIdentity.controller';
import { uploadMyLogo, removeMyLogo } from '../controllers/businessLogo.controller';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.put('/settings', restrictTo('OWNER'), updateBusinessSettings);

// The business's own logo, shown in the dashboard's top bar (services/businessLogo.service.ts).
router.put('/logo', restrictTo('OWNER'), uploadMyLogo);
router.delete('/logo', restrictTo('OWNER'), removeMyLogo);

// The owner's "Café look" (services/cafeIdentity.service.ts). Switching identity on is a super admin's call.
router.put('/identity', restrictTo('OWNER'), updateMyIdentity);

// SMEPay online checkout setup (services/checkoutSettings.service.ts)
router.get('/checkout', restrictTo('OWNER'), getMyCheckoutSettings);
router.post('/checkout/onboard', restrictTo('OWNER'), startMyCheckoutOnboarding);
router.put('/checkout/credentials', restrictTo('OWNER'), saveMyCheckoutCredentials);
router.put('/checkout/enabled', restrictTo('OWNER'), setMyCheckoutEnabled);

export default router;
