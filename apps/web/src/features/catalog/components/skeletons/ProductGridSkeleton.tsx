import { ProductCardSkeleton } from '@/features/catalog/components/skeletons/ProductCardSkeleton';

export function ProductGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="rs-product-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
