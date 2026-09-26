import { TableItem } from '../../../types';
import { ApiListResponse, ApiMessageResponse, ApiResponse } from '../../apiTypes';

export type ListTablesResponse = ApiListResponse<TableItem>;
export type CreateTableResponse = ApiResponse<TableItem>;
// The toggle endpoint's table also carries `isActive`, which TableItem (in src/types) doesn't
// model yet — extended locally rather than widening the shared type on this pass.
export type ToggleTableResponse = ApiResponse<TableItem & { isActive: boolean }> & {
  message?: string;
};
export type MarkTableEmptyResponse = ApiResponse<TableItem> & { message?: string };
export type DeleteTableResponse = ApiMessageResponse;
