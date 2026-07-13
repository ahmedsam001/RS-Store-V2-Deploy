import { SearchResultSkeleton } from '@/features/catalog/components/skeletons/SearchResultSkeleton';
import { SubcategoryNavSkeleton } from '@/features/catalog/components/skeletons/SubcategoryNavSkeleton';
import { Skeleton } from '@/shared/components/ui/Skeleton';

export function CatalogRouteSkeleton() {
  return (
    <div className="rs-catalog-redesign">
      <section className="rs-storefront-showcase-wrap" aria-hidden="true">
        <div className="rs-container">
          <div className="rs-storefront-showcase-card">
            <section className="rs-hero rs-storefront-compact-hero">
              <div className="mx-auto w-full max-w-xl space-y-3 px-4">
                <Skeleton className="mx-auto h-3 w-28 rounded-full" />
                <Skeleton className="mx-auto h-9 w-48 rounded-xl" />
                <div className="mx-auto flex h-12 w-4/5 flex-col justify-center gap-2">
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="mx-auto h-3 w-4/5 rounded-full" />
                </div>
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
        <div className="rs-catalog-filter-shell" aria-hidden="true">
          <div className="rs-catalog-toolbar">
            <div className="rs-search-control">
              <Skeleton className="rs-search-input h-11 w-full rounded-full" />
            </div>
            <Skeleton className="rs-toolbar-action rs-search-submit h-[2.35rem] w-20 rounded-full" />
            <Skeleton className="rs-toolbar-action rs-filter-toggle h-[2.35rem] w-24 rounded-full" />
            <div className="rs-sort-control">
              <Skeleton className="rs-sort-select h-11 w-full rounded-full" />
            </div>
          </div>
        </div>
        <SearchResultSkeleton />
      </div>
    </div>
  );
}
