/** Envelope every backend endpoint returns. */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export type SortOrder = 'asc' | 'desc';

/** Query parameters shared by the paginated list endpoints. */
export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}
