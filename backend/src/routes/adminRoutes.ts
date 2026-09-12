import { Router } from 'express';
import {
  getSuperAdminOverview, getAllBusinesses, toggleBusinessStatus,
  createSubscriptionPlan, updateSubscriptionPlan, getSystemHealth
} from '../controllers/superAdminController';
import { protect } from '../middleware/auth';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, restrictTo('SUPER_ADMIN'));

router.get('/overview', getSuperAdminOverview);
router.get('/businesses', getAllBusinesses);
router.put('/businesses/:id/status', toggleBusinessStatus);

router.post('/plans', createSubscriptionPlan);
router.put('/plans/:id', updateSubscriptionPlan);

router.get('/system/health', getSystemHealth);

export default router;
