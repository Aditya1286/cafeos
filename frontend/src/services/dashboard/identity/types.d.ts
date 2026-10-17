import type { PublicIdentity } from '../../../themes/types';
import { ApiResponse } from '../../apiTypes';

/** What the owner may change about the café's look. Send only what changed. */
export interface UpdateIdentityPayload {
  /** A launch theme id, or null to go back to the standard look (then send no variantId). */
  themeId?: string | null;
  variantId?: string;
  tagline?: string;
}

export type UpdateIdentityResponse = ApiResponse<PublicIdentity>;
