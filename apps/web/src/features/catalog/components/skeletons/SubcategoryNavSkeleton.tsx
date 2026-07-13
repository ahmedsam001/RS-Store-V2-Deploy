import { Skeleton } from '@/shared/components/ui/Skeleton';

export function SubcategoryNavSkeleton() {
  return (
    <div className="rs-subcategory-circle-nav" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="rs-subcategory-circle-item">
          <div className="rs-subcategory-circle-link">
            <Skeleton className="rs-subcategory-circle-image rounded-full" />
            <Skeleton className="mt-1.5 h-2.5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
