import { ApiResponse } from '../apiTypes';

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  business: {
    id: string;
    name: string;
    slug: string;
    /** Owner only — the number account-change OTPs are sent to. */
    phone?: string;
    phoneMasked: string;
  } | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type ProfileResponse = ApiResponse<AccountProfile>;
/** A fresh login token — the password change logged every other session out. */
export type ChangePasswordResponse = ApiResponse<{ token: string }>;
