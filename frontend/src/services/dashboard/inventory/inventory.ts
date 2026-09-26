import { apiRequest } from '../../api';
import {
  CreateInventoryItemPayload,
  CreateInventoryItemResponse,
  ListInventoryResponse,
} from './types';

export const list = (): Promise<ListInventoryResponse> => apiRequest('/inventory/items');

export const create = (payload: CreateInventoryItemPayload): Promise<CreateInventoryItemResponse> =>
  apiRequest('/inventory/items', 'POST', payload);
