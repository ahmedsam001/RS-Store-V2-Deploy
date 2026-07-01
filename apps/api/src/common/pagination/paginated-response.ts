import { PaginationQueryDto } from '../dto/pagination-query.dto';

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  meta: PaginationMeta;
};

export function buildPaginationMeta(query: PaginationQueryDto, total: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPreviousPage: query.page > 1,
  };
}
