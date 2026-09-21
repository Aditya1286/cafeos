// Shared response envelope shapes every domain service's types.d.ts builds on —
// mirrors what apiRequest() actually hands back, so each domain only needs to type its `data`.
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: Pagination;
}

export interface ApiMessageResponse {
  success: boolean;
  message?: string;
}
