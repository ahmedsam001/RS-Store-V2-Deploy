import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCatalogProductsRequest,
  getCatalogProductsRequest,
  primeCatalogProductsRequest,
  releaseCatalogProductsRequest,
} from '@/features/catalog/api/catalog-products-request';
import type { PaginatedCatalogProducts } from '@/shared/types/CatalogTypes';

const apiMocks = vi.hoisted(() => ({
  getCatalogProducts: vi.fn(),
}));

vi.mock('@/features/catalog/api/catalog-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/catalog/api/catalog-api')>();
  return { ...actual, getCatalogProducts: apiMocks.getCatalogProducts };
});

describe('catalog products request priming', () => {
  beforeEach(() => {
    clearCatalogProductsRequest();
    apiMocks.getCatalogProducts.mockReset();
  });

  it('reuses one early request for the page consumer and repeated initialization', async () => {
    const response = createProductsResponse();
    apiMocks.getCatalogProducts.mockResolvedValue(response);
    const query = { page: 1, limit: 20 };

    const first = primeCatalogProductsRequest(query);
    const repeated = primeCatalogProductsRequest(query);
    const consumed = getCatalogProductsRequest(query);

    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(1);
    expect(repeated.promise).toBe(first.promise);
    expect(consumed.promise).toBe(first.promise);
    await expect(consumed.promise).resolves.toBe(response);
    releaseCatalogProductsRequest(consumed);
  });

  it('aborts an obsolete primed request when a new query starts', () => {
    const signals: AbortSignal[] = [];
    apiMocks.getCatalogProducts.mockImplementation((_query, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise(() => undefined);
    });

    primeCatalogProductsRequest({ page: 1, limit: 20 });
    primeCatalogProductsRequest({ page: 1, limit: 20, search: 'dress' });

    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('does not retain a rejected request and allows a retry', async () => {
    apiMocks.getCatalogProducts
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(createProductsResponse());
    const query = { page: 1, limit: 20 };

    await expect(primeCatalogProductsRequest(query).promise).rejects.toThrow('temporary failure');
    await expect(primeCatalogProductsRequest(query).promise).resolves.toEqual(
      createProductsResponse(),
    );
    expect(apiMocks.getCatalogProducts).toHaveBeenCalledTimes(2);
  });
});

function createProductsResponse(): PaginatedCatalogProducts {
  return {
    items: [],
    meta: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}
