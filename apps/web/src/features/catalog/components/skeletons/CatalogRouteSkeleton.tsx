import { useParams } from 'react-router-dom';
import { FlashSaleHomeStripSkeleton } from '@/features/catalog/components/skeletons/FlashSaleHomeStripSkeleton';
import { SearchResultSkeleton } from '@/features/catalog/components/skeletons/SearchResultSkeleton';
import { SubcategoryNavSkeleton } from '@/features/catalog/components/skeletons/SubcategoryNavSkeleton';
import { Skeleton } from '@/shared/components/ui/Skeleton';

export function CatalogRouteSkeleton() {
  const { categorySlug } = useParams();
  const isHomePage = !categorySlug || categorySlug.toLowerCase() === 'all';

  return (
    <div className="rs-catalog-redesign">
      <section className="rs-storefront-showcase-wrap" aria-hidden="true">
        <div className="rs-container">
          <div className="rs-storefront-showcase-card">
            <section className="rs-hero rs-storefront-compact-hero">
              <div className="mx-auto w-full max-w-xl space-y-3 px-4">
                <Skeleton className="mx-auto h-3 w-28 rounded-full" />
                <Skeleton className="mx-auto h-9 w-48 rounded-xl" />
                <Skeleton className="mx-auto h-3 w-4/5 rounded-full" />
              </div>
            </section>
            <div className="rs-subcategory-dock">
              <div className="rs-subcategory-safe-line">
                <span />
                <Skeleton className="h-2.5 w-24 rounded-full" />
                <span />
              </div>
              <SubcategoryNavSkeleton />
            </div>
          </div>
        </div>
      </section>

      <div className="rs-container rs-catalog-main">
        {isHomePage ? <FlashSaleHomeStripSkeleton /> : null}
        <div className="rs-catalog-filter-shell" aria-hidden="true">
          <div className="rs-catalog-toolbar">
            <Skeleton className="h-[2.35rem] w-full rounded-full" />
            <Skeleton className="h-[2.35rem] w-20 rounded-full" />
            <Skeleton className="h-[2.35rem] w-24 rounded-full" />
            <Skeleton className="h-[2.35rem] w-full rounded-full" />
          </div>
        </div>
        <SearchResultSkeleton />
      </div>
    </div>
  );
}
