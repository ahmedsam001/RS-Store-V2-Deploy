import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { Button } from '@/shared/components/ui/Button';
import { PATHS } from '@/shared/constants/routes';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const message = readErrorMessage(error);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4" dir="ltr">
      <section className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-destructive">An error occurred</p>
        <h1 className="mt-2 text-2xl font-bold">Page could not be loaded</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <CatalogLink href={PATHS.home}>Back to catalog</CatalogLink>
        </Button>
      </section>
    </main>
  );
}

function readErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || 'Please try again';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Please try again';
}
