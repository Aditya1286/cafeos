import { apiRequest } from '../api';
import { AuthResponse, MeResponse, RegisterFormData } from './types';

export const getMe = (): Promise<MeResponse> => apiRequest('/auth/me');

export const login = (email: string, password: string): Promise<AuthResponse> =>
  apiRequest('/auth/login', 'POST', { email, password });

export const register = (formData: RegisterFormData): Promise<AuthResponse> =>
  apiRequest('/auth/register', 'POST', formData);
