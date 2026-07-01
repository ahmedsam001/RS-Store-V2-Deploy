import type { RouteObject } from 'react-router-dom';
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';
import { ROUTES } from '@/shared/constants/routes';
import { lazyNamed, withRouteLoading } from '@/routes/lazy-route';

const ProductDetailPage = lazyNamed(
  () => import('@/features/catalog/pages/ProductDetailPage'),
  'ProductDetailPage',
);

export const publicStorefrontRoutes: RouteObject[] = [
  { index: true, element: <CatalogPage /> },
  { path: ROUTES.categoryDetails, element: <CatalogPage /> },
  { path: ROUTES.productDetails, element: withRouteLoading(<ProductDetailPage />) },
];
