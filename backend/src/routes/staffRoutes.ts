import { Router } from 'express';
import {
  listStaffMembers,
  createStaffMember,
  updateStaffMember,
  resetStaffMemberPassword,
  setStaffMemberStatus
} from '../controllers/staffController';
import { protect } from '../middleware/auth';
import { enforceBusiness } from '../middleware/business';
import { restrictTo } from '../middleware/rbac';

// Owner-only staff management for their own business.
const router = Router();

router.use(protect, enforceBusiness, restrictTo('OWNER'));

router.get('/', listStaffMembers);
router.post('/', createStaffMember);
router.put('/:id', updateStaffMember);
router.put('/:id/password', resetStaffMemberPassword);
router.put('/:id/status', setStaffMemberStatus);

export default router;
