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
