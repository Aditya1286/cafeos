import { apiRequest } from '../../api';
import { CheckoutSettingsResponse, SaveCredentialsPayload } from './types';

export const getSettings = (): Promise<CheckoutSettingsResponse> =>
  apiRequest('/business/checkout');

export const startOnboarding = (): Promise<CheckoutSettingsResponse> =>
  apiRequest('/business/checkout/onboard', 'POST');

export const saveCredentials = (
  payload: SaveCredentialsPayload,
): Promise<CheckoutSettingsResponse> =>
  apiRequest('/business/checkout/credentials', 'PUT', payload);

export const setEnabled = (enabled: boolean): Promise<CheckoutSettingsResponse> =>
  apiRequest('/business/checkout/enabled', 'PUT', { enabled });
