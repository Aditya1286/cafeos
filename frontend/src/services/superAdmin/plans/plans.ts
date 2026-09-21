import { apiRequest } from '../../api';
import { CreatePlanResponse, PlanPayload, UpdatePlanResponse } from './types';

export const create = (payload: PlanPayload): Promise<CreatePlanResponse> =>
  apiRequest('/admin/plans', 'POST', payload);

export const update = (planId: string, payload: PlanPayload): Promise<UpdatePlanResponse> =>
  apiRequest(`/admin/plans/${planId}`, 'PUT', payload);
