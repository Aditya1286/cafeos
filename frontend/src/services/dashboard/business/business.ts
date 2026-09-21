import { apiRequest } from '../../api';
import { BusinessSettingsPayload, UpdateSettingsResponse } from './types';

export const updateSettings = (payload: BusinessSettingsPayload): Promise<UpdateSettingsResponse> =>
  apiRequest('/business/settings', 'PUT', payload);
