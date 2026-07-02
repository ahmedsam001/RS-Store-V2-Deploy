import { apiRequest } from '@/shared/api/http-client';
import type {
  CatalogCategory,
  CatalogProductCard,
  CatalogProductDetail,
  CatalogProductsQuery,
  FeaturedSubCategory,
  PaginatedCatalogProducts,
} from '@/shared/types/CatalogTypes';

export async function getCatalogCategories(
  search?: string,
  signal?: AbortSignal,
): Promise<CatalogCategory[]> {
  const path = buildCatalogCategoriesPath(search);
  return apiRequest<CatalogCategory[]>(path, { signal, cache: 'no-store' });
}

export async function getCatalogCategory(
  slug: string,
  signal?: AbortSignal,
): Promise<CatalogCategory> {
  return apiRequest<CatalogCategory>(`/catalog/categories/${encodeURIComponent(slug)}`, {
    signal,
    cache: 'no-store',
  });
}

export async function getCatalogProducts(
  query: CatalogProductsQuery,
  signal?: AbortSignal,
): Promise<PaginatedCatalogProducts> {
  return apiRequest<PaginatedCatalogProducts>(buildCatalogProductsPath(query), { signal });
}

export async function getCatalogProduct(
  slug: string,
  signal?: AbortSignal,
): Promise<CatalogProductDetail> {
  return apiRequest<CatalogProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`, {
    signal,
  });
}

export async function getFeaturedSubCategories(
  signal?: AbortSignal,
): Promise<FeaturedSubCategory[]> {
  return apiRequest<FeaturedSubCategory[]>('/catalog/subcategories/featured', {
    signal,
    cache: 'no-store',
  });
}

export async function getRelatedCatalogProducts(
  slug: string,
  signal?: AbortSignal,
): Promise<CatalogProductCard[]> {
  const product = await getCatalogProduct(slug, signal);
  const categorySlug = product.category?.slug;
  if (!categorySlug) return [];
  const related = await getCatalogProducts({ categorySlug, limit: 8 }, signal);
  return related.items.filter((item) => item.slug !== slug).slice(0, 4);
}

function buildCatalogCategoriesPath(search?: string): string {
  const params = new URLSearchParams();
  if (search?.trim()) params.set('search', search.trim());
  const suffix = params.toString();
  return `/catalog/categories${suffix ? `?${suffix}` : ''}`;
}

function buildCatalogProductsPath(query: CatalogProductsQuery): string {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.categorySlug?.trim()) params.set('categorySlug', query.categorySlug.trim());
  if (query.subCategorySlug?.trim()) params.set('subCategorySlug', query.subCategorySlug.trim());
  if (query.minPrice?.trim()) params.set('minPrice', query.minPrice.trim());
  if (query.maxPrice?.trim()) params.set('maxPrice', query.maxPrice.trim());
  if (query.sort) params.set('sort', query.sort);
  const suffix = params.toString();
  return `/catalog/products${suffix ? `?${suffix}` : ''}`;
}

export type CatalogFlashSale = {
  id: string;
  titleAr: string;
  titleEn?: string | null;
  discountPercent: string;
  startsAt: string;
  endsAt: string;
  status: string;
  products: CatalogProductCard[];
};

export async function getActiveFlashSales(signal?: AbortSignal): Promise<CatalogFlashSale[]> {
  return apiRequest<CatalogFlashSale[]>('/flash-sales?limit=20', { signal });
}
