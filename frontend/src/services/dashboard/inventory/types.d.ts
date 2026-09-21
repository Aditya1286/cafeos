import { InventoryItem } from '../../../types';
import { ApiListResponse, ApiResponse } from '../../apiTypes';

export type ListInventoryResponse = ApiListResponse<InventoryItem>;

export interface CreateInventoryItemPayload {
  name: string;
  // The add-inventory form keeps this as a plain string (select options match InventoryItem['unit']
  // at runtime, but aren't statically narrowed) — kept loose here to match, not widening the shared type.
  unit: InventoryItem['unit'] | string;
  currentStock: number;
  minimumStockLevel: number;
  costPerUnitPaise: number;
}

export type CreateInventoryItemResponse = ApiResponse<InventoryItem>;
