import { Skeleton } from '@/shared/components/ui/Skeleton';

export function SubcategoryNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden pb-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex shrink-0 flex-col items-center gap-1.5">
          <Skeleton className="h-22 w-22 rounded-full" style={{ height: '88px', width: '88px' }} />
          <Skeleton className="h-2.5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  );
}