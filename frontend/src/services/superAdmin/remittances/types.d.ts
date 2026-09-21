import { AdminRemittanceRequest } from '../../../types';
import { ApiListResponse, ApiMessageResponse } from '../../apiTypes';

export type ListRemittancesResponse = ApiListResponse<AdminRemittanceRequest>;
export type MarkPaidResponse = ApiMessageResponse;
export type UnmarkPaidResponse = ApiMessageResponse;
