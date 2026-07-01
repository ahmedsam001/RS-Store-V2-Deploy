import { ProductCardSkeleton } from '@/features/catalog/components/skeletons/ProductCardSkeleton';

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
