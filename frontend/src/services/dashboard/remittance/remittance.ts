import { apiRequest } from '../../api';
import { GetRemittanceSummaryResponse, MarkRemittancePaidResponse } from './types';

export const getSummary = (): Promise<GetRemittanceSummaryResponse> =>
  apiRequest('/payments/remittances');

// Self-report that outstanding commission was paid via the platform's UPI QR — a super admin
// still has to confirm receipt separately, there's no gateway webhook backing this.
export const markPaid = (utr?: string): Promise<MarkRemittancePaidResponse> =>
  apiRequest('/payments/remittances/mark-paid', 'PUT', { utr });
