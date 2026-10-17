/** The returning-guest welcome (backend services/welcome.service.ts). */
export interface GuestWelcome {
  line: string;
  /** The guest's usual dish at this café, when there is one. */
  usualProductId?: string;
}

/** Engagement events (backend services/identityEvents.service.ts, spec §11). */
export type IdentityEventKind =
  | 'welcome_shown'
  | 'welcome_usual_added'
  | 'tip_shown'
  | 'pairing_shown'
  | 'pairing_added'
  | 'pairing_ordered'
  | 'question_shown'
  | 'question_answered'
  | 'not_you_clicked';

export interface IdentityEventPayload {
  businessId: string;
  kind: IdentityEventKind;
  orderId?: string;
}
