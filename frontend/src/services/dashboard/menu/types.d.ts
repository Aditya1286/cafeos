import { Category, Product } from '../../../types';
import { ApiListResponse, ApiMessageResponse, ApiResponse } from '../../apiTypes';

export type ListCategoriesResponse = ApiListResponse<Category>;
export type ListProductsResponse = ApiListResponse<Product>;
export type CreateCategoryResponse = ApiResponse<Category>;

export interface ProductPayload {
  name: string;
  categoryId: string;
  pricePaise: number;
  description: string;
  isVeg: boolean;
  imageUrl: string;
}

export type CreateProductResponse = ApiResponse<Product>;
export type UpdateProductResponse = ApiResponse<Product>;
export type RemoveProductResponse = ApiMessageResponse;
export type RestoreProductResponse = ApiResponse<Product>;
export type ArchiveProductResponse = ApiMessageResponse;
export type UploadImageResponse = ApiResponse<{ imageUrl: string }>;
