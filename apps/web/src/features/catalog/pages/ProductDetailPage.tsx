import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PATHS } from '@/shared/constants/routes';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { Badge } from '@/shared/components/ui/Badge';
import { AddToCartPanel } from '@/features/cart/components/AddToCartPanel';
import { getCatalogProduct, getRelatedCatalogProducts } from '@/features/catalog/api/catalog-api';
import type { CatalogProductCard, CatalogProductDetail } from '@/shared/types/CatalogTypes';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { ProductGallery } from '@/features/catalog/components/ProductGallery';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { ProductDetailSkeleton } from '@/features/catalog/components/skeletons/ProductDetailSkeleton';
import { formatPrice, getCategoryUrl } from '@/features/catalog/utils/format';

export function ProductDetailPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState<CatalogProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<CatalogProductCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function hasDiscount(p: CatalogProductDetail): boolean {
    if (!p.originalPrice && !p.sale) return false;
    const currentPrice = Number(p.price.amount);
    const originalPrice = p.originalPrice ? Number(p.originalPrice.amount) : currentPrice;
    return (
      originalPrice > currentPrice &&
      Number.isFinite(currentPrice) &&
      Number.isFinite(originalPrice)
    );
  }

  useEffect(() => {
    if (!slug) {
      setError('Invalid product link');
      setIsLoading(false);
      return;
    }

    const productSlug = slug;
    const abortController = new AbortController();

    async function loadProduct() {
      try {
        setIsLoading(true);
        setError(null);
        const [item, relatedItems] = await Promise.all([
          getCatalogProduct(productSlug, abortController.signal),
          getRelatedCatalogProducts(productSlug, abortController.signal),
        ]);

        if (!abortController.signal.aborted) {
          setProduct(item);
          setRelatedProducts(relatedItems);
        }
      } catch (caughtError) {
        if (!abortController.signal.aborted) {
          setError(caughtError instanceof Error ? caughtError.message : 'Failed to load product');
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();
    return () => abortController.abort();
  }, [slug]);

  useDocumentMetadata({
    title: product ? `${product.name} | RS Store` : 'Product Details | RS Store',
    description: product?.description ?? 'Product details, price, and images from RS Store',
    canonicalPath: slug ? `/products/${slug}` : undefined,
    robots: error ? 'noindex,follow' : 'index,follow',
    openGraph: product
      ? {
          title: `${product.name} | RS Store`,
          description: product.description ?? 'Product from RS Store',
          type: 'product',
          image: product.primaryImage?.url ?? product.images[0]?.url,
        }
      : undefined,
    structuredData: product ? buildProductStructuredData(product) : undefined,
  });

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return <CatalogState title="Product unavailable" message={error ?? 'Product not found'} />;
  }

  return (
    <article className="rs-page-stack">
      <div className="rs-panel p-3 sm:p-4">
        <CatalogLink
          href={PATHS.home}
          className="inline-flex items-center gap-2 text-sm font-extrabold text-muted-foreground transition hover:text-rs-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to catalog
        </CatalogLink>
      </div>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,640px)_minmax(340px,420px)] lg:items-start lg:justify-center">
        <div className="lg:w-full lg:max-w-[640px] xl:max-w-[680px]">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="rs-panel p-4 sm:p-5">
            <div className="space-y-3">
              {product.category ? (
                <CatalogLink
                  href={getCategoryUrl(product.category.slug)}
                  className="inline-block rounded-full border border-rs-peach bg-rs-cream-warm px-3 py-1 text-xs font-extrabold text-rs-ink transition hover:border-rs-gold"
                >
                  {product.category.name}
                </CatalogLink>
              ) : null}
              {product.subCategory ? (
                <Badge variant="secondary">{product.subCategory}</Badge>
              ) : null}
              {product.sale ? (
                <Badge variant="warning">Discount {product.sale.discountPercent}%</Badge>
              ) : null}

              <div>
                <h1 className="rs-heading-1 break-words text-2xl sm:text-3xl">{product.name}</h1>
                {product.rating ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-rs-gold">
                    <span aria-hidden="true">★</span>
                    <span>{product.rating.toFixed(1)} out of 5</span>
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-rs-peach-light bg-rs-cream-warm p-4">
                {hasDiscount(product) && product.originalPrice ? (
                  <p className="text-sm font-semibold text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </p>
                ) : null}
                <p
                  className={`text-3xl font-black ${hasDiscount(product) ? 'rs-price-primary' : 'text-rs-ink'}`}
                >
                  {formatPrice(product.price)}
                </p>
                {product.sale?.discountAmount ? (
                  <p className="mt-1 text-sm font-extrabold text-rs-green">
                    Save {formatPrice(product.sale.discountAmount)}
                  </p>
                ) : null}
                {product.sale ? (
                  <p className="mt-1 text-sm font-extrabold text-rs-green">
                    Part of {product.sale.title} sale
                  </p>
                ) : null}
              </div>

              {product.description ? (
                <p className="break-words text-sm leading-7 text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {product.sourceSheinUrl ? (
                <a
                  href={product.sourceSheinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-rs-peach bg-rs-cream-warm px-3 py-2 text-xs font-extrabold text-rs-ink transition hover:border-rs-gold hover:text-rs-gold"
                >
                  <span className="truncate">Original SHEIN link</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </section>

          <section className="rs-panel p-4 sm:p-5">
            <div className="grid gap-3">
              <AddToCartPanel product={product} />
            </div>
          </section>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="rs-page-stack" aria-labelledby="related-products-heading">
          <div className="rs-section-heading">
            <span className="rs-section-kicker">You may also like</span>
            <h2 id="related-products-heading" className="rs-heading-2 mt-2">
              Related products
            </h2>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      ) : null}
    </article>
  );
}

function buildProductStructuredData(product: CatalogProductDetail): Record<string, unknown> {
  const image = product.primaryImage?.url ?? product.images[0]?.url;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? product.name,
    sku: product.sku ?? undefined,
    image: image ? [image] : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price.amount,
      priceCurrency: product.price.currency,
      availability: product.variants.some((variant) => variant.stockQuantity > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${window.location.origin}/products/${product.slug}`,
    },
  };
}
