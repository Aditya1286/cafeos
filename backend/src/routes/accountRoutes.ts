import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  removeMyAvatar,
  changeMyPassword,
  changeMyEmail
} from '../controllers/accountController';
import { protect } from '../middleware/auth';

// The logged-in user's own account — any role, including staff and super admins.
const router = Router();

router.use(protect);

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.put('/avatar', uploadMyAvatar);
router.delete('/avatar', removeMyAvatar);
router.put('/password', changeMyPassword);
// Owner only (enforced in account.service) — needs a fresh OTP to the business phone.
router.put('/email', changeMyEmail);

export default router;
