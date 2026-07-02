import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import {
  getCatalogCategories,
  getCatalogCategory,
  getCatalogProducts,
  getFeaturedSubCategories,
  getActiveFlashSales,
} from '@/features/catalog/api/catalog-api';
import type {
  CatalogCategory,
  CatalogProductsQuery,
  FeaturedSubCategory,
  PaginatedCatalogProducts,
} from '@/shared/types/CatalogTypes';
import type { CatalogFlashSale } from '@/features/catalog/api/catalog-api';
import { CatalogFilters } from '@/features/catalog/components/CatalogFilters';
import { CatalogPagination } from '@/features/catalog/components/CatalogPagination';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { SubcategoryCircleNav } from '@/features/catalog/components/SubcategoryCircleNav';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { FlashSaleHomeStrip } from '@/features/catalog/components/FlashSaleHomeStrip';
import { CategoryNavSkeleton } from '@/features/catalog/components/skeletons/CategoryNavSkeleton';
import { SubcategoryNavSkeleton } from '@/features/catalog/components/skeletons/SubcategoryNavSkeleton';
import { SearchResultSkeleton } from '@/features/catalog/components/skeletons/SearchResultSkeleton';

export function CatalogPage() {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo(() => parseQuery(searchParams, categorySlug), [categorySlug, searchParams]);
  const isHomePage = !categorySlug || categorySlug.toLowerCase() === 'all';
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [featuredSubCategories, setFeaturedSubCategories] = useState<FeaturedSubCategory[]>([]);
  const [homeFlashSales, setHomeFlashSales] = useState<CatalogFlashSale[]>([]);
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | null>(null);
  const [products, setProducts] = useState<PaginatedCatalogProducts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadCatalog() {
      try {
        setIsLoading(true);
        setError(null);

        if (isHomePage) {
          const [subCategoryItems, productItems, flashSaleItems] = await Promise.all([
            getFeaturedSubCategories(abortController.signal),
            getCatalogProducts(query, abortController.signal),
            getActiveFlashSales(abortController.signal).catch(() => []),
          ]);

          if (!abortController.signal.aborted) {
            setFeaturedSubCategories(
              subCategoryItems.filter((subcategory) => subcategory.productsCount > 0),
            );
            setHomeFlashSales(flashSaleItems.filter((sale) => sale.products.length > 0));
            setProducts(productItems);
            setCategories([]);
            setActiveCategory(null);
          }
        } else {
          const [categoryItems, productItems, category] = await Promise.all([
            getCatalogCategories(undefined, abortController.signal),
            getCatalogProducts(query, abortController.signal),
            getCatalogCategory(categorySlug, abortController.signal),
          ]);

          if (!abortController.signal.aborted) {
            setCategories(categoryItems);
            setFeaturedSubCategories([]);
            setHomeFlashSales([]);
            setProducts(productItems);
            setActiveCategory(category);
          }
        }
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load catalog');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCatalog();
    return () => abortController.abort();
  }, [categorySlug, query]);

  function updateQuery(nextQuery: CatalogProductsQuery) {
    const params = buildSearchParams({ ...query, ...nextQuery });
    const path = categorySlug ? `/categories/${categorySlug}` : '/';
    navigate(`${path}${params ? `?${params}` : ''}`);
  }

  const pageTitle = activeCategory?.name ?? displayTitleFromSlug(categorySlug) ?? 'All Products';
  const categorySubCategories = (activeCategory?.subCategories ?? []).filter(
    (subcategory) => subcategory.productCount > 0,
  );
  const visibleSubCategories =
    categorySubCategories.length > 0
      ? categorySubCategories
      : featuredSubCategories.filter((subcategory) => subcategory.productsCount > 0);
  const visibleSubCategoryParentSlug =
    categorySubCategories.length > 0 ? activeCategory?.slug : undefined;
  const hasVisibleSubCategories = visibleSubCategories.length > 0;

  useDocumentMetadata({
    title: `${pageTitle} | RS Store`,
    description:
      activeCategory?.description ?? 'Fashion shoes bags and accessories selected from SHEIN',
    canonicalPath: categorySlug ? `/categories/${categorySlug}` : '/',
    robots: 'index,follow',
    openGraph: {
      title: `${pageTitle} | RS Store`,
      description: activeCategory?.description ?? 'Modern fashion from SHEIN',
      type: 'website',
    },
    structuredData: buildCatalogStructuredData(),
  });

  if (isLoading && categories.length === 0 && featuredSubCategories.length === 0) {
    return (
      <div className="rs-catalog-redesign">
        <section className="rs-storefront-showcase-wrap" aria-label="Loading catalog">
          <div className="rs-container">
            <div className="rs-storefront-showcase-card">
              <section
                className="rs-hero rs-storefront-compact-hero"
                aria-label="Loading catalog heading"
              >
                <div className="rs-hero-branch-left" aria-hidden="true" />
                <div className="rs-hero-branch-right" aria-hidden="true" />
                <div className="rs-hero-logo-mark" aria-hidden="true" />
                <div className="relative z-10 mx-auto max-w-3xl">
                  <span className="rs-section-kicker">NEW SEASON ENDLESS STYLE</span>
                  <h1 className="mx-auto mt-3 h-10 w-52 animate-pulse rounded-full bg-rs-ink/10 sm:h-12" />
                  <div className="mx-auto mt-3 h-3 w-64 max-w-full animate-pulse rounded-full bg-rs-ink/8" />
                </div>
              </section>
              <div className="rs-subcategory-dock">
                <div className="rs-subcategory-safe-line" aria-hidden="true">
                  <span />
                  <b>Shop by style</b>
                  <span />
                </div>
                <CategoryNavSkeleton />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="rs-catalog-redesign">
      <section className="rs-storefront-showcase-wrap" aria-labelledby="catalog-title">
        <div className="rs-container">
          <div className="rs-storefront-showcase-card">
            <section className="rs-hero rs-storefront-compact-hero" aria-label="Catalog heading">
              <div className="rs-hero-branch-left" aria-hidden="true" />
              <div className="rs-hero-branch-right" aria-hidden="true" />
              <div className="rs-hero-logo-mark" aria-hidden="true" />
              <div className="relative z-10 mx-auto max-w-3xl px-2">
                <span className="rs-section-kicker">LITTLE LOOKS BIG SMILES</span>
                <h1 id="catalog-title" className="rs-heading-1 mt-2">
                  {pageTitle}
                </h1>
                {activeCategory?.description ? (
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {activeCategory.description}
                  </p>
                ) : (
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Fresh fashion picks selected for everyday style and quick checkout
                  </p>
                )}
              </div>
            </section>

            {isLoading || hasVisibleSubCategories ? (
              <div className="rs-subcategory-dock" aria-label="Shop by category">
                <div className="rs-subcategory-safe-line" aria-hidden="true">
                  <span />
                  <b>Shop by style</b>
                  <span />
                </div>
                {isLoading && visibleSubCategories.length === 0 ? (
                  <SubcategoryNavSkeleton />
                ) : (
                  <SubcategoryCircleNav
                    subcategories={visibleSubCategories}
                    activeSlug={
                      query.subCategorySlug ??
                      (activeCategory?.parentCategorySlug ? activeCategory.slug : undefined)
                    }
                    parentCategorySlug={visibleSubCategoryParentSlug}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="rs-container rs-catalog-main">
        {isHomePage && homeFlashSales.length > 0 ? (
          <FlashSaleHomeStrip sales={homeFlashSales} />
        ) : null}

        <CatalogFilters query={query} onSubmit={updateQuery} />

        {!isLoading && !error && products ? (
          <div className="rs-products-bar">
            <div className="min-w-0">
              <span className="rs-section-kicker">Curated for you</span>
              <h2 className="rs-heading-2 mt-1">{pageTitle}</h2>
            </div>
            <p className="rs-products-count">
              {products.meta.total} {products.meta.total === 1 ? 'item' : 'items'}
            </p>
          </div>
        ) : null}

        <section id="products-section" className="mt-3" aria-labelledby="products-heading">
          <div className="sr-only">
            <h2 id="products-heading">Products</h2>
          </div>

          {isLoading ? <SearchResultSkeleton /> : null}
          {error ? <CatalogState title="Error occurred" message={error} /> : null}
          {!isLoading && !error && products ? (
            <>
              <ProductGrid products={products.items} />
              <CatalogPagination
                meta={products.meta}
                onPageChange={(page) => updateQuery({ page })}
              />
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function displayTitleFromSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  if (slug.toLowerCase().includes('kid')) return 'Kids';
  if (slug.toLowerCase().includes('women')) return 'Women';
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseQuery(params: URLSearchParams, categorySlug?: string): CatalogProductsQuery {
  return {
    categorySlug,
    subCategorySlug: readString(params, 'subCategorySlug') ?? readString(params, 'subcategorySlug'),
    page: readNumber(params, 'page', 1),
    limit: readNumber(params, 'limit', 20),
    search: readString(params, 'search'),
    minPrice: readString(params, 'minPrice'),
    maxPrice: readString(params, 'maxPrice'),
    sort: readString(params, 'sort') as CatalogProductsQuery['sort'],
  };
}

function buildSearchParams(query: CatalogProductsQuery): string {
  const params = new URLSearchParams();
  const entries: Array<[string, string | number | undefined]> = [
    ['page', query.page && query.page > 1 ? query.page : undefined],
    ['limit', query.limit && query.limit !== 20 ? query.limit : undefined],
    ['search', query.search],
    ['subCategorySlug', query.subCategorySlug],
    ['minPrice', query.minPrice],
    ['maxPrice', query.maxPrice],
    ['sort', query.sort && query.sort !== 'newest' ? query.sort : undefined],
  ];

  entries.forEach(([key, value]) => {
    if (value !== undefined && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
}

function readString(params: URLSearchParams, key: string): string | undefined {
  const value = params.get(key);
  return value && value.trim() ? value.trim() : undefined;
}

function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function buildCatalogStructuredData(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'RS Store',
    url: window.location.origin,
  };
}
