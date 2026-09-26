import { AuthRequest } from '../middleware/auth';
import { serviceHandler } from '../utils/serviceHandler';
import * as staffService from '../services/staff.service';

// Owner-only staff management, always scoped to the owner's own business (req.businessId).
// Rules live in services/staff.service.ts.

export const listStaffMembers = serviceHandler((req: AuthRequest) => staffService.listStaff(req.businessId!));

export const createStaffMember = serviceHandler((req: AuthRequest) => staffService.createStaff(req.businessId!, req.body || {}), {
  status: 201,
  message: 'Staff account created.'
});

export const updateStaffMember = serviceHandler(
  (req: AuthRequest) => staffService.updateStaff(req.businessId!, req.params.id, req.body || {}),
  { message: 'Staff details updated.' }
);

export const resetStaffMemberPassword = serviceHandler(
  (req: AuthRequest) => staffService.resetStaffPassword(req.businessId!, req.params.id, req.body?.password),
  { message: 'Password reset. They will need to log in again.' }
);

export const setStaffMemberStatus = serviceHandler(
  (req: AuthRequest) => staffService.setStaffStatus(req.businessId!, req.params.id, req.body?.status)
);
