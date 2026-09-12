import { Router } from 'express';
import { getOwnerAnalytics } from '../controllers/analyticsController';
import { protect } from '../middleware/auth';
import { enforceTenant } from '../middleware/tenant';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.get('/dashboard', protect, enforceTenant, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), getOwnerAnalytics);

export default router;
