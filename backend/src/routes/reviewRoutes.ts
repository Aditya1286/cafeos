import { Router } from 'express';
import { listMyReviews } from '../controllers/orderReview.controller';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

const router = Router();

// The café's own guest reviews (services/orderReview.service.ts).
router.get('/', protect, enforceBusiness, restrictTo('SUPER_ADMIN', 'OWNER', 'MANAGER'), listMyReviews);

export default router;
