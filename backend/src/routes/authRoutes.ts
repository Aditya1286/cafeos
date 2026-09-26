import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe } from '../controllers/authController';
import { verifyPasswordResetDetails, completePasswordReset } from '../controllers/passwordResetController';
import { protect } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// Password reset guesses at an email + phone pair, so it gets a tight limiter of its own.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } }
});

// Password guessing. Only failed attempts count, so a café's staff sharing one Wi-Fi IP can
// all still sign in normally.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 10 : 1000,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many failed login attempts. Please try again later.' } }
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);

// Owner "forgot password" — OTP to the business phone number (services/passwordReset.service.ts).
router.post('/password-reset/verify-details', passwordResetLimiter, verifyPasswordResetDetails);
router.post('/password-reset', passwordResetLimiter, completePasswordReset);

export default router;
