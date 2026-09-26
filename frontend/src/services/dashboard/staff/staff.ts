import { apiRequest } from '../../api';
import {
  CreateStaffPayload,
  StaffListResponse,
  StaffMember,
  StaffMemberResponse,
  StaffPasswordResponse,
  UpdateStaffPayload,
} from './types';

export const list = (): Promise<StaffListResponse> => apiRequest('/staff');

export const create = (payload: CreateStaffPayload): Promise<StaffMemberResponse> =>
  apiRequest('/staff', 'POST', payload);

export const update = (
  staffId: string,
  payload: UpdateStaffPayload,
): Promise<StaffMemberResponse> => apiRequest(`/staff/${staffId}`, 'PUT', payload);

/** Sets a new password for the staff member and logs them out everywhere. */
export const resetPassword = (staffId: string, password: string): Promise<StaffPasswordResponse> =>
  apiRequest(`/staff/${staffId}/password`, 'PUT', { password });

export const setStatus = (
  staffId: string,
  status: StaffMember['status'],
): Promise<StaffMemberResponse> => apiRequest(`/staff/${staffId}/status`, 'PUT', { status });
