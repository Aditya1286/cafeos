import { apiRequest } from '../../api';
import type { PublicIdentity } from '../../../themes/types';
import { AdminIdentityPayload, SetIdentityResponse } from './types';

/**
 * PUT /admin/businesses/:id/identity. Resolves to the café's public identity block, which reads as
 * off (no theme) while the platform switch is off, so re-read the business list for the stored values.
 */
export const set = async (
  businessId: string,
  payload: AdminIdentityPayload,
): Promise<PublicIdentity> => {
  const res: SetIdentityResponse = await apiRequest(
    `/admin/businesses/${businessId}/identity`,
    'PUT',
    payload,
  );
  return res.data;
};
