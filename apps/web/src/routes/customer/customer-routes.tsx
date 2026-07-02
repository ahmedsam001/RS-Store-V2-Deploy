import { Navigate, type RouteObject } from 'react-router-dom';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { PATHS, ROUTES } from '@/shared/constants/routes';
import { lazyNamed, withRouteLoading } from '@/routes/lazy-route';

const CartPage = lazyNamed(() => import('@/features/cart/pages/CartPage'), 'CartPage');
const CheckoutPage = lazyNamed(
  () => import('@/features/orders/pages/CheckoutPage'),
  'CheckoutPage',
);
const OrdersPage = lazyNamed(() => import('@/features/orders/pages/OrdersPage'), 'OrdersPage');
const OrderDetailPage = lazyNamed(
  () => import('@/features/orders/pages/OrderDetailPage'),
  'OrderDetailPage',
);
const SheinRequestPage = lazyNamed(
  () => import('@/features/shein/pages/SheinRequestPage'),
  'SheinRequestPage',
);
const CustomerProfilePage = lazyNamed(
  () => import('@/features/auth/pages/CustomerProfilePage'),
  'CustomerProfilePage',
);

export const customerRoutes: RouteObject[] = [
  { path: ROUTES.cart, element: withRouteLoading(<CartPage />) },
  { path: ROUTES.checkout, element: withRouteLoading(<CheckoutPage />) },
  { path: ROUTES.orders, element: withRouteLoading(<OrdersPage />) },
  { path: ROUTES.orderDetails, element: withRouteLoading(<OrderDetailPage />) },
  { path: ROUTES.legacyWishlist, element: <Navigate to={PATHS.home} replace /> },
  {
    path: ROUTES.sheinRequest,
    element: (
      <RequireAuth
        roles={['CUSTOMER']}
        preserveReturnTo
        fallback={<Navigate to={PATHS.home} replace />}
      >
        {withRouteLoading(<SheinRequestPage />)}
      </RequireAuth>
    ),
  },
  {
    path: ROUTES.profile,
    element: (
      <RequireAuth
        roles={['CUSTOMER']}
        preserveReturnTo
        fallback={<Navigate to={PATHS.home} replace />}
      >
        {withRouteLoading(<CustomerProfilePage />)}
      </RequireAuth>
    ),
  },
];
