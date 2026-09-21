import { MySubscriptionStatus, SubscriptionPlan } from '../../../types';
import { ApiListResponse, ApiMessageResponse, ApiResponse } from '../../apiTypes';

export type GetStatusResponse = ApiResponse<MySubscriptionStatus>;
export type ListPlansResponse = ApiListResponse<SubscriptionPlan>;
export type RequestUpgradeResponse = ApiMessageResponse;
export type MarkUpgradePaidResponse = ApiMessageResponse;
export type CancelUpgradeResponse = ApiMessageResponse;
