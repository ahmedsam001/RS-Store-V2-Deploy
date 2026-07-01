import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppProvidersLayout } from '@/layouts/AppProvidersLayout';
import { adminRoutes } from '@/routes/admin/admin-routes';
import { authRoutes } from '@/routes/auth/auth-routes';
import { RouteErrorBoundary } from '@/routes/RouteErrorBoundary';
import { storefrontRoutes } from '@/routes/storefront/storefront-routes';

const router = createBrowserRouter([
  {
    element: <AppProvidersLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [...authRoutes, ...adminRoutes, ...storefrontRoutes],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
