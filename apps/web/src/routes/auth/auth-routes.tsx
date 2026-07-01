import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '@/shared/constants/routes';
import { lazyNamed, withRouteLoading } from '@/routes/lazy-route';

type SmartLoginPageProps = {
  mode: 'customer-login' | 'customer-register' | 'admin-login';
};

const SmartLoginPage = lazyNamed<SmartLoginPageProps>(
  () => import('@/features/auth/pages/SmartLoginPage'),
  'SmartLoginPage',
);

export const authRoutes: RouteObject[] = [
  { path: ROUTES.login, element: withRouteLoading(<SmartLoginPage mode="customer-login" />) },
  { path: ROUTES.register, element: withRouteLoading(<SmartLoginPage mode="customer-register" />) },
  { path: ROUTES.adminLogin, element: withRouteLoading(<SmartLoginPage mode="admin-login" />) },
];
