import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { Button } from '@/shared/components/ui/Button';
import { PATHS } from '@/shared/constants/routes';
import { useI18n } from '@/shared/i18n';

const routeErrorCopy = {
  ar: {
    occurred: 'حدث خطأ',
    title: 'تعذر تحميل الصفحة',
    tryAgain: 'حاول مرة أخرى',
    backToCatalog: 'الرجوع للكتالوج',
  },
  en: {
    occurred: 'An error occurred',
    title: 'Page could not be loaded',
    tryAgain: 'Please try again',
    backToCatalog: 'Back to catalog',
  },
} as const;

export function RouteErrorBoundary() {
  const { direction, language } = useI18n();
  const copy = routeErrorCopy[language];
  const error = useRouteError();
  const message = readErrorMessage(error, copy.tryAgain);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4" dir={direction}>
      <section className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-destructive">{copy.occurred}</p>
        <h1 className="mt-2 text-2xl font-bold">{copy.title}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <CatalogLink href={PATHS.home}>{copy.backToCatalog}</CatalogLink>
        </Button>
      </section>
    </main>
  );
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
