import { Outlet, ScrollRestoration } from 'react-router-dom';

export function AppProvidersLayout() {
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
