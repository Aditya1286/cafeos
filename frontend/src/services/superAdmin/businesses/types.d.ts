import { AdminBusinessSummary } from '../../../types';
import { RemittancePeriod } from '@/molecules/RemittanceHistoryTable';
import { ApiListResponse, ApiMessageResponse, ApiResponse } from '../../apiTypes';
import { CheckoutSettings } from '../../dashboard/checkout/types';

export type ListBusinessesResponse = ApiListResponse<AdminBusinessSummary>;
export type UpdateStatusResponse = ApiMessageResponse;
export type UpdatePlanResponse = ApiMessageResponse;
export type UpdateDemoResponse = ApiMessageResponse;

export interface BusinessRemittanceSummary {
  business: {
    _id: string;
    name: string;
    slug: string;
    commissionRatePercentage: number;
    remittanceCycleDays: number;
    taxRatePercentage: number;
  };
  cycleDays: number;
  periods: RemittancePeriod[];
  currentPeriod: {
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    ordersCount: number;
    grossAmountPaise: number;
    commissionOwedPaise: number;
  };
  totalUnpaidOwedPaise: number;
  overdueAmountPaise: number;
  overdueCount: number;
  nextDueDate: string | null;
}

export type GetBusinessRemittancesResponse = ApiResponse<BusinessRemittanceSummary>;

export interface FinanceSettingsPayload {
  commissionRatePercentage: number;
  remittanceCycleDays: number;
  taxRatePercentage: number;
}

export type UpdateFinanceSettingsResponse = ApiMessageResponse;

// A business's SMEPay checkout state as the super admin sees it (same shape the owner gets).
export type BusinessCheckoutResponse = ApiResponse<CheckoutSettings>;
