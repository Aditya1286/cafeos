import { Router } from 'express';
import { getOwnerAnalytics } from '../controllers/analyticsController';
import { queryAnalytics } from '../controllers/analyticsQueryController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.get('/dashboard', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getOwnerAnalytics);

// The analytics screen: one batched request per view (see services/analytics).
router.post('/query', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), queryAnalytics);

export default router;
