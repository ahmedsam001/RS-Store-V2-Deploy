import type { RouteObject } from 'react-router-dom';
import {
  ForbiddenPage,
  MaintenancePage,
  ServerErrorPage,
  UnauthorizedPage,
} from '@/pages/error/SystemErrorPages';
import { ROUTES } from '@/shared/constants/routes';

export const systemRoutes: RouteObject[] = [
  { path: ROUTES.unauthorized, element: <UnauthorizedPage /> },
  { path: ROUTES.forbidden, element: <ForbiddenPage /> },
  { path: ROUTES.serverError, element: <ServerErrorPage /> },
  { path: ROUTES.maintenance, element: <MaintenancePage /> },
];
