import { AuthRequest } from '../middleware/auth';
import { serviceHandler } from '../utils/serviceHandler';
import * as accountService from '../services/account.service';

// The logged-in user's own account (any role). Rules live in services/account.service.ts.

export const getMyProfile = serviceHandler((req: AuthRequest) => accountService.getProfile(req.user!._id));

export const updateMyProfile = serviceHandler((req: AuthRequest) => accountService.updateProfile(req.user!._id, req.body || {}), {
  message: 'Profile updated.'
});

export const uploadMyAvatar = serviceHandler((req: AuthRequest) => accountService.updateAvatar(req.user!._id, req.body?.image), {
  message: 'Profile picture updated.'
});

export const removeMyAvatar = serviceHandler((req: AuthRequest) => accountService.removeAvatar(req.user!._id), {
  message: 'Profile picture removed.'
});

// Returns a fresh token: every other session is logged out by the change, this one continues.
export const changeMyPassword = serviceHandler((req: AuthRequest) => accountService.changePassword(req.user!._id, req.body || {}), {
  message: 'Password changed.'
});

export const changeMyEmail = serviceHandler((req: AuthRequest) => accountService.changeOwnEmail(req.user!._id, req.body || {}), {
  message: 'Email changed.'
});
