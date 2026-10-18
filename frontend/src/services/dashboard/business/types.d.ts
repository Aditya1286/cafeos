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

/** The business's logo after a change; empty when it has none. */
export type LogoResponse = ApiMessageResponse & { data: { logoUrl: string } };
