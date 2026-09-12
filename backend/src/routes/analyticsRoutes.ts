import { Router } from 'express';
import { getOwnerAnalytics } from '../controllers/analyticsController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.get('/dashboard', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getOwnerAnalytics);

export default router;
