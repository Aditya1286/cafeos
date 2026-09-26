export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'SUPER_ADMIN' | string;
  [key: string]: any;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: AuthUser;
  };
}

export interface MeResponse {
  success: boolean;
  data: AuthUser;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  slug: string;
}

export interface PasswordResetResponse {
  success: boolean;
  data: { ok: boolean };
  message?: string;
}
