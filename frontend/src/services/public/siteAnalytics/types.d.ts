export type SiteEventType = 'pageview' | 'demo_step' | 'demo_answer' | 'demo_submit';

export interface SiteEventPayload {
  type: SiteEventType;
  visitorId: string;
  sessionId: string;
  path: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** Demo quiz: the question's key and its 0-based position. */
  step?: string;
  stepIndex?: number;
  /** demo_answer: the chosen option's id. */
  value?: string;
}
