import { Router } from 'express';
import { getMySubscriptionStatus, createUpgradeRequest, markUpgradeRequestPaid, cancelUpgradeRequest } from '../controllers/subscriptionController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.get('/status', getMySubscriptionStatus);
router.post('/upgrade-request', restrictTo('OWNER', 'MANAGER'), createUpgradeRequest);
router.put('/upgrade-request/mark-paid', restrictTo('OWNER', 'MANAGER'), markUpgradeRequestPaid);
router.delete('/upgrade-request', restrictTo('OWNER', 'MANAGER'), cancelUpgradeRequest);

export default router;
