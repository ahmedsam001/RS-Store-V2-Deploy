import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCatalogProductsRequest } from '@/features/catalog/api/catalog-products-request';
import { clearCatalogImagePreload } from '@/features/catalog/performance/catalog-image-preload';
import { catalogRouteLoader } from '@/features/catalog/routes/catalog-route-loader';
import { createMockProduct } from '@/test/test-utils';

const apiMocks = vi.hoisted(() => ({
  getCatalogProducts: vi.fn(),
}));

vi.mock('@/features/catalog/api/catalog-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/catalog/api/catalog-api')>();
  return { ...actual, getCatalogProducts: apiMocks.getCatalogProducts };
});

describe('catalog route loader', () => {
  beforeEach(() => {
    clearCatalogProductsRequest();
    clearCatalogImagePreload();
    apiMocks.getCatalogProducts.mockReset();
    window.history.replaceState({}, '', '/');
  });

  it('starts one catalog request during route matching and preloads its first image', async () => {
    const product = createMockProduct({
      primaryImage: {
        id: 'first-image',
        url: 'https://res.cloudinary.com/demo/image/upload/first.jpg',
        width: 600,
        height: 750,
        altText: 'First product',
        isPrimary: true,
        sortOrder: 0,
      },
    });
    apiMocks.getCatalogProducts.mockResolvedValue({
      items: [product],
      meta: createMeta(1),
    });
    const request = new Request(window.location.href);
    const loaderArgs = { params: {}, request };

    expect(catalogRouteLoader(loaderArgs)).toBeNull();
    expect(catalogRouteLoader(loaderArgs)).toBeNull();
    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(document.head.querySelectorAll('link[data-rs-catalog-lcp-preload]')).toHaveLength(1);
    });
  });

  it('does not preload an image for an empty catalog response', async () => {
    apiMocks.getCatalogProducts.mockResolvedValue({ items: [], meta: createMeta(0) });

    catalogRouteLoader({ params: {}, request: new Request(window.location.href) });

    await waitFor(() => expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(1));
    expect(document.head.querySelector('link[data-rs-catalog-lcp-preload]')).toBeNull();
  });
});

function createMeta(total: number) {
  return {
    page: 1,
    limit: 20,
    total,
    totalPages: total > 0 ? 1 : 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}
