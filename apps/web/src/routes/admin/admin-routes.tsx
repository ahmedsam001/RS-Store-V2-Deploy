import type { RouteObject } from 'react-router-dom';
import { AdminLoginFallback } from '@/features/admin/components/AdminLoginFallback';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { NotFoundPage } from '@/pages/error/NotFoundPage';
import { ROUTES } from '@/shared/constants/routes';
import { lazyNamed, withRouteLoading } from '@/routes/lazy-route';
import { RouteErrorBoundary } from '@/routes/RouteErrorBoundary';

const AdminShell = lazyNamed(() => import('@/features/admin/components/AdminShell'), 'AdminShell');
const AdminAuditLogsPage = lazyNamed(
  () => import('@/features/admin/pages/AdminAuditLogsPage'),
  'AdminAuditLogsPage',
);
const AdminCategoriesPage = lazyNamed(
  () => import('@/features/admin/pages/AdminCategoriesPage'),
  'AdminCategoriesPage',
);
const AdminCustomOrdersPage = lazyNamed(
  () => import('@/features/admin/pages/AdminCustomOrdersPage'),
  'AdminCustomOrdersPage',
);
const AdminDashboardPage = lazyNamed(
  () => import('@/features/admin/pages/AdminDashboardPage'),
  'AdminDashboardPage',
);
const AdminFlashSalesPage = lazyNamed(
  () => import('@/features/admin/pages/AdminFlashSalesPage'),
  'AdminFlashSalesPage',
);
const AdminOrdersPage = lazyNamed(
  () => import('@/features/admin/pages/AdminOrdersPage'),
  'AdminOrdersPage',
);
const AdminPaymentsReviewPage = lazyNamed(
  () => import('@/features/admin/pages/AdminPaymentsReviewPage'),
  'AdminPaymentsReviewPage',
);
const AdminProductsPage = lazyNamed(
  () => import('@/features/admin/pages/AdminProductsPage'),
  'AdminProductsPage',
);
const AdminReportsPage = lazyNamed(
  () => import('@/features/admin/pages/AdminReportsPage'),
  'AdminReportsPage',
);
const AdminSettingsPage = lazyNamed(
  () => import('@/features/admin/pages/AdminSettingsPage'),
  'AdminSettingsPage',
);
const AdminSheinPage = lazyNamed(
  () => import('@/features/admin/pages/AdminSheinPage'),
  'AdminSheinPage',
);
const AdminSheinBatchesPage = lazyNamed(
  () => import('@/features/admin/pages/AdminSheinBatchesPage'),
  'AdminSheinBatchesPage',
);
const AdminSheinBatchCreatePage = lazyNamed(
  () => import('@/features/admin/pages/AdminSheinBatchCreatePage'),
  'AdminSheinBatchCreatePage',
);
const AdminUploadsPage = lazyNamed(
  () => import('@/features/admin/pages/AdminUploadsPage'),
  'AdminUploadsPage',
);

export const adminRoutes: RouteObject[] = [
  {
    path: ROUTES.adminRoot,
    element: (
      <RequireAuth roles={['ADMIN', 'OWNER']} fallback={<AdminLoginFallback />}>
        {withRouteLoading(<AdminShell />)}
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: withRouteLoading(<AdminDashboardPage />) },
      { path: ROUTES.adminProducts, element: withRouteLoading(<AdminProductsPage />) },
      { path: ROUTES.adminCategories, element: withRouteLoading(<AdminCategoriesPage />) },
      { path: ROUTES.adminCustomOrders, element: withRouteLoading(<AdminCustomOrdersPage />) },
      { path: ROUTES.adminOrders, element: withRouteLoading(<AdminOrdersPage />) },
      { path: ROUTES.adminPaymentsReview, element: withRouteLoading(<AdminPaymentsReviewPage />) },
      { path: ROUTES.adminReports, element: withRouteLoading(<AdminReportsPage />) },
      { path: ROUTES.adminSettings, element: withRouteLoading(<AdminSettingsPage />) },
      { path: ROUTES.adminFlashSales, element: withRouteLoading(<AdminFlashSalesPage />) },
      { path: ROUTES.adminShein, element: withRouteLoading(<AdminSheinPage />) },
      {
        path: ROUTES.adminSheinBatchesNew,
        element: withRouteLoading(<AdminSheinBatchCreatePage />),
      },
      { path: ROUTES.adminSheinBatches, element: withRouteLoading(<AdminSheinBatchesPage />) },
      { path: ROUTES.adminUploads, element: withRouteLoading(<AdminUploadsPage />) },
      { path: ROUTES.adminAuditLogs, element: withRouteLoading(<AdminAuditLogsPage />) },
      { path: ROUTES.notFound, element: <NotFoundPage /> },
    ],
  },
];
