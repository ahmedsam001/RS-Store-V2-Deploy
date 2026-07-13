import type { CatalogProductsQuery } from '@/shared/types/CatalogTypes';

export function parseCatalogProductsQuery(
  params: URLSearchParams,
  categorySlug?: string,
): CatalogProductsQuery {
  return {
    categorySlug,
    subCategorySlug:
      readString(params, 'subCategorySlug') ?? readString(params, 'subcategorySlug'),
    page: readNumber(params, 'page', 1),
    limit: readNumber(params, 'limit', 20),
    search: readString(params, 'search'),
    minPrice: readString(params, 'minPrice'),
    maxPrice: readString(params, 'maxPrice'),
    sort: readString(params, 'sort') as CatalogProductsQuery['sort'],
  };
}

function readString(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value && value.trim() ? value.trim() : undefined;
}

function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
