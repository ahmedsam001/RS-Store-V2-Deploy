import { Skeleton } from '@/shared/components/ui/Skeleton';

export function ProductDetailSkeleton() {
  return (
    <article className="rs-page-stack" aria-hidden="true">
      <Skeleton className="h-12 w-32 rounded-full" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,400px)]">
        <div className="space-y-3">
          <Skeleton className="aspect-[3/4] w-full rounded-[1.5rem]" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-3">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Skeleton className="h-14 w-full rounded-full" />
            <Skeleton className="h-14 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}
