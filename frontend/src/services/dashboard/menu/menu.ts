import { apiRequest } from '../../api';
import {
  ArchiveProductResponse,
  CreateCategoryResponse,
  CreateProductResponse,
  ListCategoriesResponse,
  ListProductsResponse,
  ProductPayload,
  RemoveProductResponse,
  RestoreProductResponse,
  UpdateProductResponse,
  UploadImageResponse,
} from './types';

export const listCategories = (): Promise<ListCategoriesResponse> => apiRequest('/menu/categories');

export const listProducts = (): Promise<ListProductsResponse> => apiRequest('/menu/products');

export const createCategory = (name: string): Promise<CreateCategoryResponse> =>
  apiRequest('/menu/categories', 'POST', { name });

export const createProduct = (payload: ProductPayload): Promise<CreateProductResponse> =>
  apiRequest('/menu/products', 'POST', payload);

export const updateProduct = (
  productId: string,
  payload: ProductPayload,
): Promise<UpdateProductResponse> => apiRequest(`/menu/products/${productId}`, 'PUT', payload);

// Soft-remove: flips isAvailable off, keeps the item in the owner's list to restore later.
export const removeProduct = (productId: string): Promise<RemoveProductResponse> =>
  apiRequest(`/menu/products/${productId}`, 'DELETE');

export const restoreProduct = (productId: string): Promise<RestoreProductResponse> =>
  apiRequest(`/menu/products/${productId}`, 'PUT', { isAvailable: true });

// Distinct from removeProduct — this drops the item from the owner's list entirely (isDeleted).
export const archiveProduct = (productId: string): Promise<ArchiveProductResponse> =>
  apiRequest(`/menu/products/${productId}/archive`, 'PUT');

export const uploadImage = (dataUrl: string): Promise<UploadImageResponse> =>
  apiRequest('/menu/upload-image', 'POST', { image: dataUrl });
