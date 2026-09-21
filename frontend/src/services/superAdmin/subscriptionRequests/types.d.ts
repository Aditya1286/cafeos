import { AdminSubscriptionRequest, SubscriptionRequestStatus } from '../../../types';
import { ApiListResponse, ApiMessageResponse } from '../../apiTypes';

export type ListSubscriptionRequestsResponse = ApiListResponse<AdminSubscriptionRequest>;
export type ApproveRequestResponse = ApiMessageResponse;
export type RejectRequestResponse = ApiMessageResponse;

export type { SubscriptionRequestStatus };
