import { Navigate, type RouteObject } from 'react-router-dom';

import { lazyNamed, withRouteLoading } from '@/routes/lazy-route';
import { PATHS, ROUTES } from '@/shared/constants/routes';

import { StorefrontNavbar } from '@/features/catalog/components/StorefrontNavbar';
import { CustomerProfilePage } from '@/features/auth/pages/CustomerProfilePage';
import { RequireAuth } from '@/features/auth/RequireAuth';

const CatalogPage = lazyNamed(
  () => import('@/features/catalog/pages/CatalogPage'),
  'CatalogPage',
);

const ProductDetailPage = lazyNamed(
  () => import('@/features/catalog/pages/ProductDetailPage'),
  'ProductDetailPage',
);

const CartPage = lazyNamed(
  () => import('@/features/cart/pages/CartPage'),
  'CartPage',
);

const CheckoutPage = lazyNamed(
  () => import('@/features/orders/pages/CheckoutPage'),
  'CheckoutPage',
);

const OrdersPage = lazyNamed(
  () => import('@/features/orders/pages/OrdersPage'),
  'OrdersPage',
);

const OrderDetailPage = lazyNamed(
  () => import('@/features/orders/pages/OrderDetailPage'),
  'OrderDetailPage',
);

const SheinRequestPage = lazyNamed(
  () => import('@/features/shein/pages/SheinRequestPage'),
  'SheinRequestPage',
);

const CustomOrderPage = lazyNamed(
  () => import('@/features/custom-orders/pages/CustomOrderPage'),
  'CustomOrderPage',
);

const FlashSalesPage = lazyNamed(
  () => import('@/features/catalog/pages/FlashSalesPage'),
  'FlashSalesPage',
);

export const storefrontRoutes: RouteObject[] = [
  {
    element: <StorefrontNavbar />,
    children: [
      {
        index: true,
        element: withRouteLoading(<CatalogPage />),
      },
      {
        path: ROUTES.productDetails,
        element: withRouteLoading(<ProductDetailPage />),
      },
      {
        path: ROUTES.categoryDetails,
        element: withRouteLoading(<CatalogPage />),
      },
      {
        path: ROUTES.flashSales,
        element: withRouteLoading(<FlashSalesPage />),
      },
      {
        path: ROUTES.cart,
        element: withRouteLoading(<CartPage />),
      },
      {
        path: ROUTES.checkout,
        element: withRouteLoading(<CheckoutPage />),
      },
      {
        path: ROUTES.orders,
        element: withRouteLoading(<OrdersPage />),
      },
      {
        path: ROUTES.orderDetails,
        element: withRouteLoading(<OrderDetailPage />),
      },
      {
        path: ROUTES.customOrder,
        element: (
          <RequireAuth preserveReturnTo fallback={<Navigate to={PATHS.login} replace />}>
            {withRouteLoading(<CustomOrderPage />)}
          </RequireAuth>
        ),
      },
      {
        path: ROUTES.sheinRequest,
        element: withRouteLoading(<SheinRequestPage />),
      },
      {
        path: ROUTES.profile,
        element: <CustomerProfilePage />,
      },
      {
        path: ROUTES.legacyWishlist,
        element: <Navigate to={PATHS.home} replace />,
      },
    ],
  },
];
