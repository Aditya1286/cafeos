import { apiRequest } from '../../api';
import {
  CancelUpgradeResponse,
  GetStatusResponse,
  ListPlansResponse,
  MarkUpgradePaidResponse,
  RequestUpgradeResponse,
} from './types';

export const getStatus = (): Promise<GetStatusResponse> => apiRequest('/subscriptions/status');

// Publicly listable (no auth required), but only ever fetched here alongside the owner's
// current status to render "here's what you could upgrade to".
export const listPlans = (): Promise<ListPlansResponse> => apiRequest('/public/plans');

// Asking for a plan never changes what's active — a super admin approving this (after payment) does.
export const requestUpgrade = (
  planId: string,
  billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
): Promise<RequestUpgradeResponse> =>
  apiRequest('/subscriptions/upgrade-request', 'POST', { planId, billingCycle });

// Self-report payment via the platform's UPI QR — a super admin still has to verify and approve.
export const markUpgradePaid = (utr?: string): Promise<MarkUpgradePaidResponse> =>
  apiRequest('/subscriptions/upgrade-request/mark-paid', 'PUT', { utr });

export const cancelUpgrade = (): Promise<CancelUpgradeResponse> =>
  apiRequest('/subscriptions/upgrade-request', 'DELETE');
