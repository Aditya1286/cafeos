import { apiRequest } from '../../api';
import { ListRemittancesResponse, MarkPaidResponse, UnmarkPaidResponse } from './types';

export const list = (status: 'UNPAID' | 'PAID'): Promise<ListRemittancesResponse> =>
  apiRequest(`/admin/remittances?status=${status}`);

export const pay = (id: string): Promise<MarkPaidResponse> => apiRequest(`/admin/remittances/${id}/pay`, 'PUT', {});

export const unpay = (id: string): Promise<UnmarkPaidResponse> => apiRequest(`/admin/remittances/${id}/unpay`, 'PUT', {});
