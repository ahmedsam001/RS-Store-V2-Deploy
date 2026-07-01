import { Skeleton } from '@/shared/components/ui/Skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="rs-product-card" aria-hidden="true">
      <Skeleton className="aspect-[3/4] w-full" />
      <div className="p-3 sm:p-3.5 space-y-2.5">
        <Skeleton className="h-2.5 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-full rounded-lg" />
        <Skeleton className="h-3.5 w-4/5 rounded-lg" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}
