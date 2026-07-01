import { Skeleton } from '@/shared/components/ui/Skeleton';
import { ProductGridSkeleton } from '@/features/catalog/components/skeletons/ProductGridSkeleton';

export function SearchResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-28 rounded-full" />
        <Skeleton className="h-2.5 w-48 rounded-full" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
