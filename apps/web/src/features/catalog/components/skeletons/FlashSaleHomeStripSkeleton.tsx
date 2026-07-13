import { Skeleton } from '@/shared/components/ui/Skeleton';

export function FlashSaleHomeStripSkeleton() {
  return (
    <section className="rs-flash-compact" aria-hidden="true">
      <div className="rs-flash-compact-info">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-7 w-40 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
      </div>
      <div className="rs-flash-compact-products">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="rs-flash-compact-card">
            <Skeleton className="rs-flash-compact-image rounded-xl" />
            <div className="rs-flash-compact-card-body">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-2/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
