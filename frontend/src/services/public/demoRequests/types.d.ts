import { ApiMessageResponse } from '../../apiTypes';

export interface SubmitDemoRequestPayload {
  name: string;
  brandName: string;
  phone: string;
  email?: string;
  city: string;
  businessType?: string;
  message?: string;
  interestedPlan?: string;
  consentToContact: boolean;
  /** Honeypot: must stay empty. Real visitors never see the field. */
  website?: string;
}

export type SubmitDemoRequestResponse = ApiMessageResponse;
