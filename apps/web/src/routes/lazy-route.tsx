import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
import { RouteLoading } from '@/routes/RouteLoading';

export function lazyNamed<TProps extends object>(
  loader: () => Promise<unknown>,
  exportName: string,
) {
  return lazy(async () => {
    const module = (await loader()) as Record<string, ComponentType<TProps>>;
    const component = module[exportName];
    if (!component) {
      throw new Error(`Lazy route export ${exportName} was not found`);
    }
    return { default: component };
  });
}

export function withRouteLoading(element: ReactElement) {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>;
}
