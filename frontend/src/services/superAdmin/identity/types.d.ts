import type { PublicIdentity } from '../../../themes/types';
import { ApiResponse } from '../../apiTypes';

/** A super admin's per-café identity change. Send only what changed. */
export interface AdminIdentityPayload {
  /** Switch café identity on or off for this café. */
  enabled?: boolean;
  /** A launch theme id, or null to clear the theme (then send no variantId). */
  themeId?: string | null;
  variantId?: string;
}

export type SetIdentityResponse = ApiResponse<PublicIdentity>;

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

export interface CafeIdentitySummaryRow {
  businessId: string;
  name: string;
  enabledAt?: string;
  appliedAt?: string;
  /** Share 0..1 of guests who came back within 30 days; null = no guests in that window. */
  returnRateBefore: number | null;
  returnRateAfter: number | null;
  events30d: Partial<Record<IdentityEventKind, number>>;
}

export interface CafeIdentitySummaryResponse {
  success: boolean;
  data: CafeIdentitySummaryRow[];
}
