import { buildCatalogProductsPath, getCatalogProducts } from '@/features/catalog/api/catalog-api';
import type { CatalogProductsQuery, PaginatedCatalogProducts } from '@/shared/types/CatalogTypes';

type PrimedCatalogProductsRequest = {
  controller: AbortController;
  key: string;
  promise: Promise<PaginatedCatalogProducts>;
};

export type CatalogProductsRequest = {
  key: string;
  promise: Promise<PaginatedCatalogProducts>;
  primed: boolean;
};

let primedRequest: PrimedCatalogProductsRequest | null = null;

export function getCatalogProductsRequestKey(query: CatalogProductsQuery): string {
  return buildCatalogProductsPath(query);
}

export function primeCatalogProductsRequest(
  query: CatalogProductsQuery,
  routeSignal?: AbortSignal,
): CatalogProductsRequest {
  const key = getCatalogProductsRequestKey(query);
  if (primedRequest?.key === key) {
    return { key, promise: primedRequest.promise, primed: true };
  }

  primedRequest?.controller.abort();

  const controller = new AbortController();
  const promise = getCatalogProducts(query, controller.signal);
  const nextRequest: PrimedCatalogProductsRequest = { controller, key, promise };
  primedRequest = nextRequest;

  const abortForRouteChange = () => controller.abort(routeSignal?.reason);
  if (routeSignal?.aborted) {
    abortForRouteChange();
  } else {
    routeSignal?.addEventListener('abort', abortForRouteChange, { once: true });
  }

  void promise.then(
    () => routeSignal?.removeEventListener('abort', abortForRouteChange),
    () => {
      routeSignal?.removeEventListener('abort', abortForRouteChange);
      if (primedRequest === nextRequest) {
        primedRequest = null;
      }
    },
  );

  return { key, promise, primed: true };
}

export function getCatalogProductsRequest(
  query: CatalogProductsQuery,
  signal?: AbortSignal,
): CatalogProductsRequest {
  const key = getCatalogProductsRequestKey(query);
  if (primedRequest?.key === key) {
    return { key, promise: primedRequest.promise, primed: true };
  }

  return { key, promise: getCatalogProducts(query, signal), primed: false };
}

export function releaseCatalogProductsRequest(request: CatalogProductsRequest): void {
  if (request.primed && primedRequest?.key === request.key && primedRequest.promise === request.promise) {
    primedRequest = null;
  }
}

export function clearCatalogProductsRequest(): void {
  primedRequest?.controller.abort();
  primedRequest = null;
}
