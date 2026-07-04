import { PackageSearch } from 'lucide-react';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';
import { CatalogProductCard } from '@/shared/types/CatalogTypes';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { useI18n } from '@/shared/i18n';

type ProductGridProps = {
  products: CatalogProductCard[];
};

export function ProductGrid({ products }: ProductGridProps) {
  const { t } = useI18n();

  if (products.length === 0) {
    return (
      <div className="rs-panel mx-auto flex min-h-0 max-w-xl flex-col items-center justify-center p-6 text-center sm:p-7">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-sm">
          <PackageSearch className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-extrabold text-rs-ink">{t('catalog.emptyTitle')}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {t('catalog.emptyMessage')}
        </p>
        <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6">
          {t('nav.allProducts')}
        </CatalogLink>
      </div>
    );
  }

  return (
    <div className="rs-product-grid" data-product-count={products.length}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
