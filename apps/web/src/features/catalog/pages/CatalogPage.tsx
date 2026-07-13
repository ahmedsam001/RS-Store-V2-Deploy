import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import {
  getCatalogCategory,
  getFeaturedSubCategories,
  getActiveFlashSales,
} from '@/features/catalog/api/catalog-api';
import {
  getCatalogProductsRequest,
  releaseCatalogProductsRequest,
} from '@/features/catalog/api/catalog-products-request';
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
import { SubcategoryNavSkeleton } from '@/features/catalog/components/skeletons/SubcategoryNavSkeleton';
import { SearchResultSkeleton } from '@/features/catalog/components/skeletons/SearchResultSkeleton';
import {
  clearCatalogImagePreload,
  syncCatalogImagePreload,
} from '@/features/catalog/performance/catalog-image-preload';
import { parseCatalogProductsQuery } from '@/features/catalog/utils/catalog-query';
import { localizeKnownLabel, localizeProductText, useI18n } from '@/shared/i18n';

export function CatalogPage() {
  const { language, t } = useI18n();
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo(
    () => parseCatalogProductsQuery(searchParams, categorySlug),
    [categorySlug, searchParams],
  );
  const isHomePage = !categorySlug || categorySlug.toLowerCase() === 'all';
  const [featuredSubCategories, setFeaturedSubCategories] = useState<FeaturedSubCategory[]>([]);
  const [homeFlashSales, setHomeFlashSales] = useState<CatalogFlashSale[]>([]);
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | null>(null);
  const [products, setProducts] = useState<PaginatedCatalogProducts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isSubCategoriesLoading, setIsSubCategoriesLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    const productsRequest = getCatalogProductsRequest(query, abortController.signal);

    async function loadProducts() {
      try {
        setIsProductsLoading(true);
        setError(null);
        setProducts(null);

        const productItems = await productsRequest.promise;
        if (!abortController.signal.aborted) {
          syncCatalogImagePreload(productItems.items[0], productsRequest.key);
          setProducts(productItems);
        }
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          clearCatalogImagePreload(productsRequest.key);
          setError(caughtError instanceof Error ? caughtError.message : t('catalog.emptyMessage'));
        }
      } finally {
        releaseCatalogProductsRequest(productsRequest);
        if (!abortController.signal.aborted) {
          setIsProductsLoading(false);
        }
      }
    }

    void loadProducts();
    return () => {
      abortController.abort();
      clearCatalogImagePreload(productsRequest.key);
    };
  }, [query, t]);

  useEffect(() => {
    const abortController = new AbortController();

    if (isHomePage) {
      setActiveCategory(null);
      setFeaturedSubCategories([]);
      setHomeFlashSales([]);
      setIsSubCategoriesLoading(true);

      void getFeaturedSubCategories(abortController.signal)
        .then((subCategoryItems) => {
          if (!abortController.signal.aborted) {
            setFeaturedSubCategories(
              subCategoryItems.filter((subcategory) => subcategory.productsCount > 0),
            );
          }
        })
        .catch(() => {
          if (!abortController.signal.aborted) {
            setFeaturedSubCategories([]);
          }
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setIsSubCategoriesLoading(false);
          }
        });

      void getActiveFlashSales(abortController.signal)
        .then((flashSaleItems) => {
          if (!abortController.signal.aborted) {
            setHomeFlashSales(flashSaleItems.filter((sale) => sale.products.length > 0));
          }
        })
        .catch(() => {
          if (!abortController.signal.aborted) {
            setHomeFlashSales([]);
          }
        });
    } else if (categorySlug) {
      setFeaturedSubCategories([]);
      setHomeFlashSales([]);
      setActiveCategory(null);
      setIsSubCategoriesLoading(true);

      void getCatalogCategory(categorySlug, abortController.signal)
        .then((category) => {
          if (!abortController.signal.aborted) {
            setActiveCategory(category);
          }
        })
        .catch(() => {
          if (!abortController.signal.aborted) {
            setActiveCategory(null);
          }
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setIsSubCategoriesLoading(false);
          }
        });
    }

    return () => abortController.abort();
  }, [categorySlug, isHomePage]);

  function updateQuery(nextQuery: CatalogProductsQuery) {
    const params = buildSearchParams({ ...query, ...nextQuery });
    const path = categorySlug ? `/categories/${categorySlug}` : '/';
    navigate(`${path}${params ? `?${params}` : ''}`);
  }

  const routeCategoryTitle = displayTitleFromSlug(categorySlug);
  const rawPageTitle = routeCategoryTitle ?? activeCategory?.name ?? t('catalog.allProducts');
  const pageTitle = localizeKnownLabel(localizeProductText(rawPageTitle, language), language) || t('catalog.allProducts');
  const knownCategoryDescription = categoryDescriptionFromSlug(categorySlug, t);
  const categoryDescription = knownCategoryDescription ||
    (activeCategory?.description ? localizeProductText(activeCategory.description, language) : '');
  const categorySubCategories = isHomePage
    ? []
    : (activeCategory?.subCategories ?? []).filter((subcategory) => subcategory.productCount > 0);
  const visibleSubCategories = isHomePage
    ? featuredSubCategories.filter((subcategory) => subcategory.productsCount > 0)
    : categorySubCategories;
  const visibleSubCategoryParentSlug =
    categorySubCategories.length > 0 ? activeCategory?.slug : undefined;
  const hasVisibleSubCategories = visibleSubCategories.length > 0;

  useDocumentMetadata({
    title: `${pageTitle} | RS Store`,
    description:
      categoryDescription || t('catalog.metaDescription'),
    canonicalPath: categorySlug ? `/categories/${categorySlug}` : '/',
    robots: 'index,follow',
    openGraph: {
      title: `${pageTitle} | RS Store`,
      description: categoryDescription || t('catalog.ogDescription'),
      type: 'website',
    },
    structuredData: buildCatalogStructuredData(),
  });

  return (
    <div className="rs-catalog-redesign">
      <section className="rs-storefront-showcase-wrap" aria-labelledby="catalog-title">
        <div className="rs-container">
          <div className="rs-storefront-showcase-card">
            <section className="rs-hero rs-storefront-compact-hero" aria-label={t('catalog.heading')}>
              <div className="rs-hero-branch-left" aria-hidden="true" />
              <div className="rs-hero-branch-right" aria-hidden="true" />
              <div className="rs-hero-logo-mark" aria-hidden="true" />
              <div className="relative z-10 mx-auto max-w-3xl px-2">
                <span className="rs-section-kicker">{t('catalog.kicker.home')}</span>
                <h1 id="catalog-title" className="rs-heading-1 mt-2">
                  {pageTitle}
                </h1>
                {categoryDescription ? (
                  <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {categoryDescription}
                  </p>
                ) : (
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {t('catalog.description')}
                  </p>
                )}
              </div>
            </section>

            {isSubCategoriesLoading || hasVisibleSubCategories ? (
              <div className="rs-subcategory-dock" aria-label={t('catalog.shopByCategory')}>
                <div className="rs-subcategory-safe-line" aria-hidden="true">
                  <span />
                  <b>{t('catalog.shopByStyle')}</b>
                  <span />
                </div>
                {isSubCategoriesLoading && visibleSubCategories.length === 0 ? (
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

        {isProductsLoading ? (
          <SearchResultSkeleton count={Math.min(query.limit ?? 20, 20)} />
        ) : null}

        {!isProductsLoading && !error && products ? (
          <div className="rs-products-bar">
            <div className="min-w-0">
              <span className="rs-section-kicker">{t('catalog.productsKicker')}</span>
              <h2 className="rs-heading-2 mt-1">{pageTitle}</h2>
            </div>
            <p className="rs-products-count">
              {t('catalog.productsFound', { count: products.meta.total })}
            </p>
          </div>
        ) : null}

        <section id="products-section" className="mt-3" aria-labelledby="products-heading">
          <div className="sr-only">
            <h2 id="products-heading">{t('nav.allProducts')}</h2>
          </div>

          {error ? <CatalogState title={t('catalog.emptyTitle')} message={error} /> : null}
          {!isProductsLoading && !error && products ? (
            <>
              <ProductGrid products={products.items} />
              <div className="rs-catalog-pagination-slot">
                <CatalogPagination
                  meta={products.meta}
                  onPageChange={(page) => updateQuery({ page })}
                />
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}


function categoryDescriptionFromSlug(
  slug: string | undefined,
  t: ReturnType<typeof useI18n>['t'],
): string {
  const normalized = slug?.toLowerCase() ?? '';
  if (normalized.includes('kid')) return t('catalog.categoryDescription.kids');
  if (normalized.includes('women')) return t('catalog.categoryDescription.women');
  return '';
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

function buildCatalogStructuredData(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'RS Store',
    url: window.location.origin,
  };
}
