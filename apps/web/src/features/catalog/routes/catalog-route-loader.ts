import type { LoaderFunctionArgs } from 'react-router-dom';
import { primeCatalogProductsRequest } from '@/features/catalog/api/catalog-products-request';
import {
  clearCatalogImagePreload,
  syncCatalogImagePreload,
} from '@/features/catalog/performance/catalog-image-preload';
import { parseCatalogProductsQuery } from '@/features/catalog/utils/catalog-query';

export function catalogRouteLoader({
  params,
  request,
}: Pick<LoaderFunctionArgs, 'params' | 'request'>): null {
  const routeUrl = new URL(request.url);
  const query = parseCatalogProductsQuery(routeUrl.searchParams, params.categorySlug);
  const productsRequest = primeCatalogProductsRequest(query, request.signal);

  clearCatalogImagePreload();
  void productsRequest.promise.then(
    (products) => {
      if (isCurrentLocation(routeUrl)) {
        syncCatalogImagePreload(products.items[0], productsRequest.key);
      }
    },
    () => clearCatalogImagePreload(productsRequest.key),
  );

  return null;
}

function isCurrentLocation(routeUrl: URL): boolean {
  if (typeof window === 'undefined') return false;
  return `${window.location.pathname}${window.location.search}` ===
    `${routeUrl.pathname}${routeUrl.search}`;
}
