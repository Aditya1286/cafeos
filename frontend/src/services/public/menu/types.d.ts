import { Business, Category, Product, TableItem } from '../../../types';
import type { PublicIdentity } from '../../../themes/types';
import { ApiResponse } from '../../apiTypes';

/** A café as the public pages see it: `identity` decides its guest-page theme (themes/). */
export type PublicBusiness = Business & { identity?: PublicIdentity };

export type GetTableByTokenResponse = ApiResponse<{ table: TableItem; business: PublicBusiness }>;
export type GetBusinessBySlugResponse = ApiResponse<PublicBusiness>;
/** A category's mascot line (backend services/menuTips.service.ts): its real best seller, or a House special. */
export interface CategoryTip {
  productId: string;
  line: string;
  kind: 'best-seller' | 'house-special';
}

// popularProductIds: the café's real best sellers (backend services/menuPopularity.service.ts), best first.
// The café-identity extras are present only while identity is on for the café.
export type GetMenuResponse = ApiResponse<{
  categories: Category[];
  products: Product[];
  popularProductIds?: string[];
  categoryTips?: Record<string, CategoryTip>;
  houseSpecialIds?: string[];
  /** The generic welcome for a guest the café doesn't recognise (shown when /welcome is 204). */
  firstVisitLine?: string;
}>;
