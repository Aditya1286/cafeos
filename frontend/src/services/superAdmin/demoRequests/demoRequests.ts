import { apiRequest } from '../../api';
import {
  DemoRequestListQuery,
  ListDemoRequestsResponse,
  UpdateDemoRequestPayload,
  UpdateDemoRequestResponse,
} from './types';

const buildQuery = <T extends object>(params: T): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.toString();
};

export const list = (query: DemoRequestListQuery): Promise<ListDemoRequestsResponse> =>
  apiRequest(`/admin/demo-requests?${buildQuery(query)}`);

export const update = (
  id: string,
  payload: UpdateDemoRequestPayload,
): Promise<UpdateDemoRequestResponse> => apiRequest(`/admin/demo-requests/${id}`, 'PUT', payload);
