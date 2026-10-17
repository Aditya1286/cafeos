import { apiRequest } from '../../api';
import type { PublicIdentity } from '../../../themes/types';
import { UpdateIdentityPayload, UpdateIdentityResponse } from './types';

/** The owner's "Café look" save (PUT /business/identity). Resolves to the café's public identity block. */
export const update = async (payload: UpdateIdentityPayload): Promise<PublicIdentity> => {
  const res: UpdateIdentityResponse = await apiRequest('/business/identity', 'PUT', payload);
  return res.data;
};
