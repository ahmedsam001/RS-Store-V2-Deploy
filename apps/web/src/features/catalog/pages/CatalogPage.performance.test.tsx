import { StrictMode } from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCatalogProductsRequest,
  primeCatalogProductsRequest,
} from '@/features/catalog/api/catalog-products-request';
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';
import { clearCatalogImagePreload } from '@/features/catalog/performance/catalog-image-preload';
import type { FeaturedSubCategory, PaginatedCatalogProducts } from '@/shared/types/CatalogTypes';
import { createMockProduct, renderWithRouter } from '@/test/test-utils';

const apiMocks = vi.hoisted(() => ({
  getActiveFlashSales: vi.fn(),
  getCatalogCategory: vi.fn(),
  getCatalogProducts: vi.fn(),
  getFeaturedSubCategories: vi.fn(),
}));

vi.mock('@/features/catalog/api/catalog-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/catalog/api/catalog-api')>();
  return { ...actual, ...apiMocks };
});

describe('CatalogPage early products request', () => {
  beforeEach(() => {
    clearCatalogProductsRequest();
    clearCatalogImagePreload();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.getActiveFlashSales.mockResolvedValue([]);
    apiMocks.getCatalogCategory.mockResolvedValue(null);
  });

  it('reuses the primed request and renders products without waiting for categories', async () => {
    const products = deferred<PaginatedCatalogProducts>();
    const categories = deferred<FeaturedSubCategory[]>();
    apiMocks.getCatalogProducts.mockReturnValue(products.promise);
    apiMocks.getFeaturedSubCategories.mockReturnValue(categories.promise);
    primeCatalogProductsRequest({ page: 1, limit: 20 });

    const view = renderWithRouter(<CatalogPage />);
    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(1);
    expect(view.container.querySelectorAll('.rs-product-card')).toHaveLength(20);
    expect(view.container.querySelectorAll('.rs-subcategory-circle-item')).toHaveLength(4);

    await act(() => products.resolve(createProductsResponse()));

    expect(await screen.findByRole('article', { name: 'Premium Dress' })).toBeInTheDocument();
    expect(view.container.querySelectorAll('.rs-subcategory-circle-item')).toHaveLength(4);
  });

  it('does not duplicate the initial request under Strict Mode', async () => {
    apiMocks.getCatalogProducts.mockResolvedValue(createProductsResponse());
    apiMocks.getFeaturedSubCategories.mockResolvedValue([]);
    primeCatalogProductsRequest({ page: 1, limit: 20 });

    renderWithRouter(
      <StrictMode>
        <CatalogPage />
      </StrictMode>,
    );

    expect(await screen.findByRole('article', { name: 'Premium Dress' })).toBeInTheDocument();
    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(1);
  });

  it('shows the existing error state without registering an image preload', async () => {
    const products = deferred<PaginatedCatalogProducts>();
    apiMocks.getCatalogProducts.mockReturnValue(products.promise);
    apiMocks.getFeaturedSubCategories.mockResolvedValue([]);
    primeCatalogProductsRequest({ page: 1, limit: 20 });
    renderWithRouter(<CatalogPage />);

    await act(() => products.reject(new Error('Catalog unavailable')));

    expect(await screen.findByText('Catalog unavailable')).toBeInTheDocument();
    expect(document.head.querySelector('link[data-rs-catalog-lcp-preload]')).toBeNull();
  });

  it('does not let an obsolete initial response overwrite newer filtered products', async () => {
    const initialProducts = deferred<PaginatedCatalogProducts>();
    const filteredProducts = deferred<PaginatedCatalogProducts>();
    apiMocks.getCatalogProducts
      .mockReturnValueOnce(initialProducts.promise)
      .mockReturnValueOnce(filteredProducts.promise);
    apiMocks.getFeaturedSubCategories.mockResolvedValue([]);
    primeCatalogProductsRequest({ page: 1, limit: 20 });
    renderWithRouter(<CatalogPage />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Search products' }), 'dress');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(2);

    await act(() =>
      filteredProducts.resolve(
        createProductsResponse(createMockProduct({ id: 'filtered', name: 'Filtered Dress' })),
      ),
    );
    await act(() => initialProducts.resolve(createProductsResponse()));

    expect(await screen.findByRole('article', { name: 'Filtered Dress' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Premium Dress' })).not.toBeInTheDocument();
    expect(document.head.querySelectorAll('link[data-rs-catalog-lcp-preload]')).toHaveLength(0);
  });
});

function createProductsResponse(
  product = createMockProduct({
    primaryImage: {
      id: 'product-image',
      url: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
      width: 600,
      height: 750,
      altText: 'Premium Dress image',
      isPrimary: true,
      sortOrder: 0,
    },
  }),
): PaginatedCatalogProducts {
  return {
    items: [product],
    meta: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
