import { apiRequest } from '../api';
import { ChangePasswordPayload, ChangePasswordResponse, ProfileResponse } from './types';

export const getProfile = (): Promise<ProfileResponse> => apiRequest('/account/profile');

export const updateProfile = (name: string): Promise<ProfileResponse> =>
  apiRequest('/account/profile', 'PUT', { name });

/** `image` is a base64 data URL (JPEG/PNG/WEBP, under 5MB). */
export const uploadAvatar = (image: string): Promise<ProfileResponse> =>
  apiRequest('/account/avatar', 'PUT', { image });

/** `audio` is a base64 data URL (MP3/WAV/OGG/M4A/AAC, under 1MB): the sound that plays when an order arrives. */
export const uploadRingtone = (audio: string): Promise<ProfileResponse> =>
  apiRequest('/account/ringtone', 'PUT', { audio });

export const removeRingtone = (): Promise<ProfileResponse> =>
  apiRequest('/account/ringtone', 'DELETE');

export const removeAvatar = (): Promise<ProfileResponse> => apiRequest('/account/avatar', 'DELETE');

export const changePassword = (payload: ChangePasswordPayload): Promise<ChangePasswordResponse> =>
  apiRequest('/account/password', 'PUT', payload);

/** Owner only — call right after verifying an ACCOUNT OTP on the business phone. */
export const changeEmail = (newEmail: string): Promise<ProfileResponse> =>
  apiRequest('/account/email', 'PUT', { newEmail });
