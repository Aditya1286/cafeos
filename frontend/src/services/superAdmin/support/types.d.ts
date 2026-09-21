import { ApiListResponse, ApiResponse, Pagination } from '../../apiTypes';

export interface TicketListQuery {
  page: number;
  limit: number;
  q?: string;
  status?: string;
}

export interface ListTicketsResponse {
  success: boolean;
  data: any[];
  pagination?: Pagination;
  meta?: { needsAttentionCount?: number };
}

export type ListAgentsResponse = ApiListResponse<any>;
export type AssignTicketResponse = ApiResponse<any> & { message?: string };
export type EscalateTicketResponse = ApiResponse<any> & { message?: string };
export type ResolveTicketResponse = ApiResponse<any> & { message?: string };
export type ToggleAvailabilityResponse = { success: boolean; message?: string };
