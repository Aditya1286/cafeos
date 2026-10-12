import { ApiResponse, Pagination } from '../../apiTypes';

export type DemoRequestStatus = 'NEW' | 'CONTACTED' | 'TRIAL_STARTED' | 'WON' | 'LOST';

export interface DemoRequest {
  id: string;
  name: string;
  brandName: string;
  phone: string;
  email?: string;
  city: string;
  businessType?: string;
  message?: string;
  interestedPlan?: string;
  status: DemoRequestStatus;
  adminNote?: string;
  contactedAt?: string;
  createdAt: string;
}

export interface DemoRequestListQuery {
  page: number;
  limit: number;
  q?: string;
  status?: string;
}

export interface ListDemoRequestsResponse {
  success: boolean;
  data: DemoRequest[];
  pagination?: Pagination;
  meta?: { newCount?: number };
}

export interface UpdateDemoRequestPayload {
  status?: DemoRequestStatus;
  adminNote?: string;
}

export type UpdateDemoRequestResponse = ApiResponse<DemoRequest>;
