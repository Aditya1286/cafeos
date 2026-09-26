import { Business, Category, Product, TableItem } from '../../../types';
import { ApiResponse } from '../../apiTypes';

export type GetTableByTokenResponse = ApiResponse<{ table: TableItem; business: Business }>;
export type GetBusinessBySlugResponse = ApiResponse<Business>;
// popularProductIds: the café's real best sellers (backend services/menuPopularity.service.ts), best first.
export type GetMenuResponse = ApiResponse<{
  categories: Category[];
  products: Product[];
  popularProductIds?: string[];
}>;
