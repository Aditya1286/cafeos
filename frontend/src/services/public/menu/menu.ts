import { apiRequest } from '../../api';
import { GetBusinessBySlugResponse, GetMenuResponse, GetTableByTokenResponse } from './types';

export const getTableByToken = (qrToken: string): Promise<GetTableByTokenResponse> =>
  apiRequest(`/public/t/${qrToken}`);

export const getBusinessBySlug = (slug: string): Promise<GetBusinessBySlugResponse> =>
  apiRequest(`/public/c/${slug}`);

export const getMenu = (businessId: string): Promise<GetMenuResponse> =>
  apiRequest(`/public/c/${businessId}/menu`);
