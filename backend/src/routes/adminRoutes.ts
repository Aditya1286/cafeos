import { Router } from 'express';
import {
  getSuperAdminOverview, getAllBusinesses, toggleBusinessStatus,
  createSubscriptionPlan, updateSubscriptionPlan, getSystemHealth,
  getSuperAdminAnalytics, getBusinessRemittances, markRemittancePaid, markRemittanceUnpaid,
  getAllRemittanceRequests, updateBusinessFinanceSettings, getBusinessHourlyHeatmap,
  getTopBusinessesByRevenue, changeBusinessPlan, getBusinessInsights,
  getSubscriptionRequests, approveSubscriptionRequest, rejectSubscriptionRequest,
  getAdminRefundOrders, getAdminRefundInsights
} from '../controllers/superAdminController';
import { protect } from '../middleware/auth';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, restrictTo('SUPER_ADMIN'));

router.get('/overview', getSuperAdminOverview);
router.get('/analytics', getSuperAdminAnalytics);
router.get('/analytics/business-heatmap', getBusinessHourlyHeatmap);
router.get('/analytics/business-insights', getBusinessInsights);
router.get('/analytics/top-businesses', getTopBusinessesByRevenue);
router.get('/businesses', getAllBusinesses);
router.put('/businesses/:id/status', toggleBusinessStatus);
router.put('/businesses/:id/finance-settings', updateBusinessFinanceSettings);
router.put('/businesses/:id/plan', changeBusinessPlan);
router.get('/businesses/:id/remittances', getBusinessRemittances);
router.get('/remittances', getAllRemittanceRequests);
router.get('/refunds', getAdminRefundOrders);
router.get('/refunds/insights', getAdminRefundInsights);
router.put('/remittances/:id/pay', markRemittancePaid);
router.put('/remittances/:id/unpay', markRemittanceUnpaid);

router.post('/plans', createSubscriptionPlan);
router.put('/plans/:id', updateSubscriptionPlan);

router.get('/subscription-requests', getSubscriptionRequests);
router.put('/subscription-requests/:id/approve', approveSubscriptionRequest);
router.put('/subscription-requests/:id/reject', rejectSubscriptionRequest);

router.get('/system/health', getSystemHealth);

export default router;
