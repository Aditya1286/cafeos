import { Business, Category, Product, TableItem } from '../../../types';
import { ApiResponse } from '../../apiTypes';

export type GetTableByTokenResponse = ApiResponse<{ table: TableItem; business: Business }>;
export type GetBusinessBySlugResponse = ApiResponse<Business>;
export type GetMenuResponse = ApiResponse<{ categories: Category[]; products: Product[] }>;
