import { useEffect, useState } from 'react';
import { getActiveFlashSales } from '@/features/catalog/api/catalog-api';
import type { CatalogFlashSale } from '@/features/catalog/api/catalog-api';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';

export function FlashSalesPage() {
  const [sales, setSales] = useState<CatalogFlashSale[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    getActiveFlashSales(abortController.signal)
      .then((items) => {
        if (!abortController.signal.aborted) setSales(items);
      })
      .catch(() => {
        if (!abortController.signal.aborted) setError('Unable to load flash sales right now');
      });
    return () => abortController.abort();
  }, []);

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rs-panel p-8 text-center">
          <h1 className="text-2xl font-black text-rs-ink">Flash Sales</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6 inline-flex">
            Back to store
          </CatalogLink>
        </div>
      </section>
    );
  }

  if (!sales) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rs-panel p-8 text-center text-sm font-semibold text-muted-foreground">
          Loading flash sales
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rs-panel overflow-hidden p-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#B8860B]">Limited Time</p>
        <h1 className="mt-3 text-3xl font-black text-rs-ink sm:text-4xl">Flash Sales</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Shop active offers before they expire. Every product price is calculated from the live flash sale used by checkout.
        </p>
      </div>

      {sales.length === 0 ? (
        <div className="rs-panel p-8 text-center">
          <h2 className="text-xl font-black text-rs-ink">No active flash sales right now</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check the full catalog for available products</p>
          <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6 inline-flex">
            View All Products
          </CatalogLink>
        </div>
      ) : (
        sales.map((sale) => (
          <article key={sale.id} className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black text-rs-ink">{sale.titleEn || sale.titleAr}</h2>
                <p className="text-sm font-semibold text-[#ff3f6c]">Up to {sale.discountPercent}% off</p>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                Ends {new Date(sale.endsAt).toLocaleString()}
              </p>
            </div>
            <ProductGrid products={sale.products} />
          </article>
        ))
      )}
    </section>
  );
}
