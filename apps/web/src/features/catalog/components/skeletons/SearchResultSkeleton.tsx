import { Skeleton } from '@/shared/components/ui/Skeleton';
import { ProductGridSkeleton } from '@/features/catalog/components/skeletons/ProductGridSkeleton';
import { useI18n } from '@/shared/i18n';

export function SearchResultSkeleton({ count = 20 }: { count?: number }) {
  const { t } = useI18n();

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{t('catalog.loading')}</span>
      <div className="rs-products-bar" aria-hidden="true">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-24 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <ProductGridSkeleton count={count} />
      <div className="rs-catalog-pagination-slot" aria-hidden="true">
        <Skeleton className="h-[4.25rem] w-full rounded-2xl" />
      </div>
    </div>
  );
}
