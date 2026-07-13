import { Skeleton } from '@/shared/components/ui/Skeleton';

export function ProductCardSkeleton() {
  return (
    <div className="rs-product-card product-card--polished" aria-hidden="true">
      <Skeleton className="rs-product-image-wrap product-card__media w-full rounded-none" />
      <div className="product-card__content">
        <Skeleton className="h-[1.35rem] w-16 rounded-full" />
        <div className="mt-2 min-h-[2.75rem] space-y-1.5">
          <Skeleton className="h-3.5 w-full rounded-lg" />
          <Skeleton className="h-3.5 w-4/5 rounded-lg" />
        </div>
        <div className="mt-2.5 space-y-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-3.5 w-14 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-[2.35rem] w-full rounded-full" />
      </div>
    </div>
  );
}
