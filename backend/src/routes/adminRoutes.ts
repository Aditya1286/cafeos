import { Router } from 'express';
import {
  getSuperAdminOverview, getAllBusinesses, toggleBusinessStatus,
  createSubscriptionPlan, updateSubscriptionPlan, getSystemHealth,
  getSuperAdminAnalytics, getBusinessRemittances, markRemittancePaid, markRemittanceUnpaid,
  getAllRemittanceRequests, updateBusinessFinanceSettings
} from '../controllers/superAdminController';
import { protect } from '../middleware/auth';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, restrictTo('SUPER_ADMIN'));

router.get('/overview', getSuperAdminOverview);
router.get('/analytics', getSuperAdminAnalytics);
router.get('/businesses', getAllBusinesses);
router.put('/businesses/:id/status', toggleBusinessStatus);
router.put('/businesses/:id/finance-settings', updateBusinessFinanceSettings);
router.get('/businesses/:id/remittances', getBusinessRemittances);
router.get('/remittances', getAllRemittanceRequests);
router.put('/remittances/:id/pay', markRemittancePaid);
router.put('/remittances/:id/unpay', markRemittanceUnpaid);

router.post('/plans', createSubscriptionPlan);
router.put('/plans/:id', updateSubscriptionPlan);

router.get('/system/health', getSystemHealth);

export default router;
