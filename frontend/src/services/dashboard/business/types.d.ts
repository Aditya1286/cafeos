import { Business } from '../../../types';
import { ApiMessageResponse } from '../../apiTypes';

export interface BusinessSettingsPayload {
  upiVpa?: string;
  tablesEnabled?: boolean;
  /** Master QR (general menu link) takes counter orders while tables are on. */
  masterQrEnabled?: boolean;
  taxRatePercentage?: number;
  /** Seller GSTIN printed on invoices; an empty string clears it. */
  gstin?: string;
}

export type UpdateSettingsResponse = ApiMessageResponse & { data?: Business };
