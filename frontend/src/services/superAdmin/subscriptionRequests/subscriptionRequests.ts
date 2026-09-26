import { apiRequest } from '../../api';
import {
  ApproveRequestResponse,
  ListSubscriptionRequestsResponse,
  RejectRequestResponse,
  SubscriptionRequestStatus,
} from './types';

export const list = (
  status: SubscriptionRequestStatus,
): Promise<ListSubscriptionRequestsResponse> =>
  apiRequest(`/admin/subscription-requests?status=${status}`);

export const approve = (id: string): Promise<ApproveRequestResponse> =>
  apiRequest(`/admin/subscription-requests/${id}/approve`, 'PUT', {});

export const reject = (id: string, reason?: string): Promise<RejectRequestResponse> =>
  apiRequest(`/admin/subscription-requests/${id}/reject`, 'PUT', { reason });
