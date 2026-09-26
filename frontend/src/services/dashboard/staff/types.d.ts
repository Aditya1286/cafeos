import { ApiResponse } from '../../apiTypes';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl: string;
  createdAt: string;
}

export interface StaffList {
  staff: StaffMember[];
  /** maxActive is null when the plan sets no limit. */
  limit: { maxActive: number | null; active: number };
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export type UpdateStaffPayload = Partial<Pick<StaffMember, 'name' | 'email' | 'phone'>>;

export type StaffListResponse = ApiResponse<StaffList>;
export type StaffMemberResponse = ApiResponse<StaffMember>;
export type StaffPasswordResponse = ApiResponse<{ ok: boolean }>;
