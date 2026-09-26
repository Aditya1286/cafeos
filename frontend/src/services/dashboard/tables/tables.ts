import { apiRequest } from '../../api';
import {
  CreateTableResponse,
  DeleteTableResponse,
  ListTablesResponse,
  MarkTableEmptyResponse,
  ToggleTableResponse,
} from './types';

export const list = (): Promise<ListTablesResponse> => apiRequest('/tables');

export const create = (tableNumber: string, capacity: number): Promise<CreateTableResponse> =>
  apiRequest('/tables', 'POST', { tableNumber, capacity });

// Disables/re-enables one table's QR without deleting it (table row + its order history stay).
export const toggleActive = (tableId: string): Promise<ToggleTableResponse> =>
  apiRequest(`/tables/${tableId}/toggle`, 'PUT');

// Manual override for a stuck "Occupied" indicator — force-clears status without touching any order.
export const markEmpty = (tableId: string): Promise<MarkTableEmptyResponse> =>
  apiRequest(`/tables/${tableId}/mark-empty`, 'PUT');

export const remove = (tableId: string): Promise<DeleteTableResponse> =>
  apiRequest(`/tables/${tableId}`, 'DELETE');
