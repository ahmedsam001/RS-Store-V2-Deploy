import { useEffect, useState } from 'react';
import { getActiveFlashSales } from '@/features/catalog/api/catalog-api';
import type { CatalogFlashSale } from '@/features/catalog/api/catalog-api';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { PATHS } from '@/shared/constants/routes';
import { useI18n, type Language } from '@/shared/i18n';

const flashSalesCopy = {
  ar: {
    failedLoad: 'تعذر تحميل العروض السريعة حاليًا',
    title: 'العروض السريعة',
    backToStore: 'الرجوع للمتجر',
    loading: 'جاري تحميل العروض السريعة',
    kicker: 'لفترة محدودة',
    description: 'تسوق العروض المتاحة قبل انتهائها. سعر كل منتج محسوب من العرض الفعّال المستخدم عند الدفع.',
    emptyTitle: 'لا توجد عروض سريعة حاليًا',
    emptyMessage: 'تصفح الكتالوج الكامل للمنتجات المتاحة',
    viewAllProducts: 'عرض كل المنتجات',
    upTo: 'حتى',
    off: 'خصم',
    ends: 'ينتهي',
  },
  en: {
    failedLoad: 'Unable to load flash sales right now',
    title: 'Flash Sales',
    backToStore: 'Back to store',
    loading: 'Loading flash sales',
    kicker: 'Limited Time',
    description:
      'Shop active offers before they expire. Every product price is calculated from the live flash sale used by checkout.',
    emptyTitle: 'No active flash sales right now',
    emptyMessage: 'Check the full catalog for available products',
    viewAllProducts: 'View All Products',
    upTo: 'Up to',
    off: 'off',
    ends: 'Ends',
  },
} as const;

export function FlashSalesPage() {
  const { language } = useI18n();
  const copy = flashSalesCopy[language];
  const [sales, setSales] = useState<CatalogFlashSale[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    getActiveFlashSales(abortController.signal)
      .then((items) => {
        if (!abortController.signal.aborted) setSales(items);
      })
      .catch(() => {
        if (!abortController.signal.aborted) setError(copy.failedLoad);
      });
    return () => abortController.abort();
  }, [copy.failedLoad]);

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rs-panel p-8 text-center">
          <h1 className="text-2xl font-black text-rs-ink">{copy.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6 inline-flex">
            {copy.backToStore}
          </CatalogLink>
        </div>
      </section>
    );
  }

  if (!sales) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rs-panel p-8 text-center text-sm font-semibold text-muted-foreground">
          {copy.loading}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rs-panel overflow-hidden p-8 text-center">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#B8860B]">
          {copy.kicker}
        </p>
        <h1 className="mt-3 text-3xl font-black text-rs-ink sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {copy.description}
        </p>
      </div>

      {sales.length === 0 ? (
        <div className="rs-panel p-8 text-center">
          <h2 className="text-xl font-black text-rs-ink">{copy.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.emptyMessage}</p>
          <CatalogLink href={PATHS.home} className="rs-btn-primary mt-6 inline-flex">
            {copy.viewAllProducts}
          </CatalogLink>
        </div>
      ) : (
        sales.map((sale) => (
          <article key={sale.id} className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black text-rs-ink">{localizedSaleTitle(sale, language)}</h2>
                <p className="text-sm font-semibold text-[#ff3f6c]">
                  {copy.upTo} {sale.discountPercent}% {copy.off}
                </p>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                {copy.ends} {formatSaleDate(sale.endsAt, language)}
              </p>
            </div>
            <ProductGrid products={sale.products} />
          </article>
        ))
      )}
    </section>
  );
}

function localizedSaleTitle(sale: CatalogFlashSale, language: Language) {
  return language === 'ar' ? sale.titleAr || sale.titleEn : sale.titleEn || sale.titleAr;
}

function formatSaleDate(value: string, language: Language) {
  return new Date(value).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
}
