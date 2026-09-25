import { apiRequest } from '../../api';
import {
  FinanceSettingsPayload,
  GetBusinessRemittancesResponse,
  ListBusinessesResponse,
  UpdateFinanceSettingsResponse,
  UpdateDemoResponse,
  UpdatePlanResponse,
  UpdateStatusResponse
} from './types';

export const list = (): Promise<ListBusinessesResponse> => apiRequest('/admin/businesses');

export const updateStatus = (businessId: string, status: string): Promise<UpdateStatusResponse> =>
  apiRequest(`/admin/businesses/${businessId}/status`, 'PUT', { status });

export const updatePlan = (businessId: string, planId: string): Promise<UpdatePlanResponse> =>
  apiRequest(`/admin/businesses/${businessId}/plan`, 'PUT', { planId });

export const setDemo = (businessId: string, isDemo: boolean): Promise<UpdateDemoResponse> =>
  apiRequest(`/admin/businesses/${businessId}/demo`, 'PUT', { isDemo });

export const getRemittanceSummary = (businessId: string): Promise<GetBusinessRemittancesResponse> =>
  apiRequest(`/admin/businesses/${businessId}/remittances`);

export const updateFinanceSettings = (businessId: string, payload: FinanceSettingsPayload): Promise<UpdateFinanceSettingsResponse> =>
  apiRequest(`/admin/businesses/${businessId}/finance-settings`, 'PUT', payload);
