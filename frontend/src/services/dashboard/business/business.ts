import { apiRequest } from '../../api';
import { BusinessSettingsPayload, CoverResponse, LogoResponse, UpdateSettingsResponse } from './types';

/** `image` is a base64 data URL (JPEG/PNG/WEBP, under 5MB). Owner only. */
export const uploadLogo = (image: string): Promise<LogoResponse> =>
  apiRequest('/business/logo', 'PUT', { image });

export const removeLogo = (): Promise<LogoResponse> => apiRequest('/business/logo', 'DELETE');

export const uploadCover = (image: string): Promise<CoverResponse> =>
  apiRequest('/business/cover', 'PUT', { image });

export const removeCover = (): Promise<CoverResponse> => apiRequest('/business/cover', 'DELETE');

export const updateSettings = (payload: BusinessSettingsPayload): Promise<UpdateSettingsResponse> =>
  apiRequest('/business/settings', 'PUT', payload);
