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
  /** The demo quiz's tap-to-choose answers, with their wording (constants/demoFunnel.ts). */
  answers?: DemoRequestAnswer[];
  /** Where the visit came from (utils/siteVisitor.ts). */
  source?: DemoRequestSource;
  consentToContact: boolean;
  /** Honeypot: must stay empty. Real visitors never see the field. */
  website?: string;
}

export interface DemoRequestAnswer {
  key: string;
  question: string;
  value: string;
  answer: string;
}

export interface DemoRequestSource {
  visitorId?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
}

export type SubmitDemoRequestResponse = ApiMessageResponse;
