import { Business, Category, Product, TableItem } from '../../../types';
import type { PublicIdentity } from '../../../themes/types';
import { ApiResponse } from '../../apiTypes';

/** A café as the public pages see it: `identity` decides its guest-page theme (themes/). */
export type PublicBusiness = Business & { identity?: PublicIdentity };

export type GetTableByTokenResponse = ApiResponse<{ table: TableItem; business: PublicBusiness }>;
export type GetBusinessBySlugResponse = ApiResponse<PublicBusiness>;
// popularProductIds: the café's real best sellers (backend services/menuPopularity.service.ts), best first.
export type GetMenuResponse = ApiResponse<{
  categories: Category[];
  products: Product[];
  popularProductIds?: string[];
}>;
