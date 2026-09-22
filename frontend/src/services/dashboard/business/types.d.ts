import { Business } from '../../../types';
import { ApiMessageResponse } from '../../apiTypes';

export interface BusinessSettingsPayload {
  upiVpa?: string;
  tablesEnabled?: boolean;
  taxRatePercentage?: number;
}

export type UpdateSettingsResponse = ApiMessageResponse & { data?: Business };
