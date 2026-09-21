import { SubscriptionPlan } from '../../../types';
import { ApiMessageResponse } from '../../apiTypes';

export interface PlanPayload {
  name: string;
  code: string;
  description: string;
  monthlyPricePaise: number;
  annualPricePaise: number;
  perOrderFeePaise: number;
  limits: {
    maxTables: number;
    maxMenuItems: number;
    maxStaff: number;
    inventoryEnabled: boolean;
    analyticsAdvanced: boolean;
  };
  isPopular: boolean;
  status: SubscriptionPlan['status'];
}

export type CreatePlanResponse = ApiMessageResponse;
export type UpdatePlanResponse = ApiMessageResponse;
