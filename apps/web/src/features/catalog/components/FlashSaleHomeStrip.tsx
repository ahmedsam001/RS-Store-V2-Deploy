import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import type { CatalogFlashSale } from '@/features/catalog/api/catalog-api';
import { formatPrice, getProductUrl } from '@/features/catalog/utils/format';
import { PATHS } from '@/shared/constants/routes';

type FlashSaleHomeStripProps = {
  sales: CatalogFlashSale[];
};

export function FlashSaleHomeStrip({ sales }: FlashSaleHomeStripProps) {
  const activeSales = sales.filter((sale) => sale.products.length > 0);

  if (activeSales.length === 0) {
    return null;
  }

  const sale = activeSales[0];
  const products = sale.products.slice(0, 5);
  const title = sale.titleEn || sale.titleAr || 'Flash Sale';
  const discount = sale.discountPercent || 0;
  const countdownText = formatSaleEnd(sale.endsAt);

  return (
    <section className="rs-flash-compact" aria-labelledby="flash-sale-title">
      <div className="rs-flash-compact-info">
        <div className="rs-flash-compact-header">
          <div className="rs-flash-compact-heading">
            <span className="rs-flash-compact-kicker">Flash Sale</span>
            <span className="rs-flash-compact-live">Limited time</span>
            <span className="rs-flash-compact-countdown">Ends in {countdownText}</span>
          </div>
          <CatalogLink
            href={PATHS.flashSales}
            className="rs-flash-compact-cta"
            aria-label="Shop flash sale products"
          >
            View deals
            <span aria-hidden="true">→</span>
          </CatalogLink>
        </div>
        <div className="rs-flash-compact-copy">
          <h2 id="flash-sale-title" className="rs-flash-compact-title">
            {title}
          </h2>
          <p className="rs-flash-compact-meta">
            <span>Up to {discount}% off</span>
          </p>
        </div>
      </div>

      <div className="rs-flash-compact-products" aria-label="Flash sale products">
        {products.map((product) => (
          <CatalogLink
            key={product.id}
            href={getProductUrl(product.slug)}
            className="rs-flash-compact-card"
          >
            <div className="rs-flash-compact-image">
              <ImageWithFallback
                src={product.primaryImage?.url}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover"
                fallbackVariant="product"
              />
              <span className="rs-flash-compact-discount">
                -{product.sale?.discountPercent ?? discount}%
              </span>
            </div>
            <div className="rs-flash-compact-card-body">
              <span className="rs-flash-compact-product-name">{product.name}</span>
              <div className="rs-flash-compact-prices">
                {product.originalPrice ? (
                  <span className="rs-flash-compact-old-price">
                    {formatPrice(product.originalPrice)}
                  </span>
                ) : null}
                <span className="rs-flash-compact-sale-price">{formatPrice(product.price)}</span>
              </div>
            </div>
          </CatalogLink>
        ))}
      </div>
    </section>
  );
}

function formatSaleEnd(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff > 0) {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
