export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  revalidate?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, string | string[]>;
}

export type MutationResult<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
};
