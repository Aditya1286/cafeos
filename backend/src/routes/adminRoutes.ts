import { Router } from 'express';
import {
  getSuperAdminOverview, getAllRestaurants, toggleRestaurantStatus,
  createSubscriptionPlan, updateSubscriptionPlan, getSystemHealth
} from '../controllers/superAdminController';
import { protect } from '../middleware/auth';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, restrictTo('SUPER_ADMIN'));

router.get('/overview', getSuperAdminOverview);
router.get('/restaurants', getAllRestaurants);
router.put('/restaurants/:id/status', toggleRestaurantStatus);

router.post('/plans', createSubscriptionPlan);
router.put('/plans/:id', updateSubscriptionPlan);

router.get('/system/health', getSystemHealth);

export default router;
