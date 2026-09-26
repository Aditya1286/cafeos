import { Request } from 'express';
import { serviceHandler } from '../utils/serviceHandler';
import * as passwordResetService from '../services/passwordReset.service';

// Public "forgot password" for business owners — see services/passwordReset.service.ts for the
// three-step flow (details check → OTP to the business phone → reset).

export const verifyPasswordResetDetails = serviceHandler((req: Request) => passwordResetService.verifyResetDetails(req.body || {}));

export const completePasswordReset = serviceHandler((req: Request) => passwordResetService.resetPassword(req.body || {}), {
  message: 'Password reset. Log in with your new password.'
});
