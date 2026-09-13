import { Router } from 'express';
import { updateBusinessSettings } from '../controllers/businessController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

router.use(protect, enforceBusiness);

router.put('/settings', restrictTo('OWNER'), updateBusinessSettings);

export default router;
