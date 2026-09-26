import { Business } from '../../../types';
import { ApiMessageResponse } from '../../apiTypes';

export interface BusinessSettingsPayload {
  upiVpa?: string;
  tablesEnabled?: boolean;
  /** Master QR (general menu link) takes counter orders while tables are on. */
  masterQrEnabled?: boolean;
  taxRatePercentage?: number;
}

export type UpdateSettingsResponse = ApiMessageResponse & { data?: Business };
