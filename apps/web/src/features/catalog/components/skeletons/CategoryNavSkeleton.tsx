import { Skeleton } from '@/shared/components/ui/Skeleton';

export function CategoryNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden pb-2" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex shrink-0 flex-col items-center gap-1.5">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-2.5 w-10 rounded-full" />
        </div>
      ))}
    </div>
  );
}
