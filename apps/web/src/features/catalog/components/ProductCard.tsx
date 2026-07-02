import { memo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { CatalogProductCard } from '@/shared/types/CatalogTypes';
import { formatPrice, getProductUrl } from '@/features/catalog/utils/format';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { ResponsiveImage } from '@/features/catalog/components/ResponsiveImage';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

type ProductCardProps = {
  product: CatalogProductCard;
  className?: string;
};

type PriceLike = CatalogProductCard['price'] | number | string | null | undefined;

type ProductPriceDisplay = {
  currentPrice: CatalogProductCard['price'];
  oldPrice: CatalogProductCard['price'] | null;
  hasDiscount: boolean;
  discountPercentage: number;
  discountAmount: CatalogProductCard['price'] | null;
};

function getProductPriceDisplay(product: CatalogProductCard): ProductPriceDisplay {
  const fallbackCurrency = product.price.currency;
  const currentPrice =
    toCatalogPrice(product.salePrice, fallbackCurrency) ??
    toCatalogPrice(product.currentPrice, fallbackCurrency) ??
    product.price;
  const oldPrice =
    toCatalogPrice(product.originalPrice, fallbackCurrency) ??
    toCatalogPrice(product.oldPrice, fallbackCurrency) ??
    toCatalogPrice(product.compareAtPrice, fallbackCurrency) ??
    toCatalogPrice(product.sale?.originalPrice, fallbackCurrency);

  const currentAmount = priceAmount(currentPrice);
  const oldAmount = priceAmount(oldPrice);
  const hasDiscount =
    oldPrice !== null &&
    Number.isFinite(currentAmount) &&
    Number.isFinite(oldAmount) &&
    oldAmount > currentAmount;

  return {
    currentPrice,
    oldPrice: hasDiscount ? oldPrice : null,
    hasDiscount,
    discountPercentage: hasDiscount
      ? resolveDiscountPercentage(product, currentAmount, oldAmount)
      : 0,
    discountAmount: hasDiscount
      ? resolveDiscountAmount(product, currentPrice.currency, currentAmount, oldAmount)
      : null,
  };
}

function toCatalogPrice(
  value: PriceLike,
  fallbackCurrency: string,
): CatalogProductCard['price'] | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') {
    return { amount: String(value), currency: fallbackCurrency };
  }
  if ('amount' in value && value.amount !== undefined) {
    return { amount: String(value.amount), currency: value.currency || fallbackCurrency };
  }
  return null;
}

function priceAmount(price: PriceLike): number {
  if (price === null || price === undefined) return Number.NaN;
  if (typeof price === 'number') return price;
  if (typeof price === 'string') return Number(price);
  return Number(price.amount);
}

function resolveDiscountPercentage(
  product: CatalogProductCard,
  currentAmount: number,
  oldAmount: number,
): number {
  const explicitDiscount = Number(
    product.sale?.discountPercent ?? product.discountPercentage ?? product.discount,
  );
  if (Number.isFinite(explicitDiscount) && explicitDiscount > 0)
    return Math.round(explicitDiscount);
  return Math.round(((oldAmount - currentAmount) / oldAmount) * 100);
}

function resolveDiscountAmount(
  product: CatalogProductCard,
  fallbackCurrency: string,
  currentAmount: number,
  oldAmount: number,
): CatalogProductCard['price'] | null {
  const explicitDiscountAmount = toCatalogPrice(product.sale?.discountAmount, fallbackCurrency);
  if (explicitDiscountAmount && priceAmount(explicitDiscountAmount) > 0)
    return explicitDiscountAmount;

  const computedAmount = oldAmount - currentAmount;
  if (!Number.isFinite(computedAmount) || computedAmount <= 0) return null;
  return { amount: computedAmount.toFixed(2), currency: fallbackCurrency };
}

export const ProductCard = memo(function ProductCard({ product, className }: ProductCardProps) {
  const navigate = useNavigate();
  const hasPurchasableVariants = product.variantCount > 0;
  const productUrl = getProductUrl(product.slug);
  const priceDisplay = getProductPriceDisplay(product);

  function handlePrimaryAction() {
    navigate(productUrl);
  }

  return (
    <article
      className={`rs-product-card product-card--polished ${className ?? ''}`}
      tabIndex={-1}
      aria-label={product.name}
    >
      <div className="rs-product-image-wrap product-card__media">
        <CatalogLink href={productUrl} className="block h-full" aria-label={`View ${product.name}`}>
          {product.primaryImage ? (
            <ResponsiveImage
              src={product.primaryImage.url}
              alt={product.primaryImage.altText ?? product.name}
              className="rs-product-image"
              widths={[280, 400, 520, 640]}
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              width={600}
              height={750}
            />
          ) : (
            <ImageWithFallback
              src={null}
              alt={product.name}
              className="rs-product-image"
              fallbackVariant="product"
            />
          )}
          <span className="product-card__image-overlay" aria-hidden="true">
            View item
          </span>
        </CatalogLink>

        {priceDisplay.hasDiscount ? (
          <span
            className="rs-badge-sale product-card__discount-badge"
            aria-label={`Discount ${priceDisplay.discountPercentage}%`}
          >
            -{priceDisplay.discountPercentage}%
          </span>
        ) : null}
      </div>

      <div className="product-card__content">
        {product.category ? (
          <p
            className="product-card__category"
            title={`${product.category.name}${product.subCategory ? ` / ${product.subCategory}` : ''}`}
          >
            {product.category.name}
            {product.subCategory ? ` / ${product.subCategory}` : ''}
          </p>
        ) : null}

        <CatalogLink href={productUrl} className="product-card__title">
          {product.name}
        </CatalogLink>

        <div className="product-card__price-stack">
          <div className="product-card__price-row">
            <span
              className={`product-card__price ${
                priceDisplay.hasDiscount
                  ? 'product-card__price--sale rs-price-primary'
                  : 'text-rs-ink'
              }`}
            >
              {formatPrice(priceDisplay.currentPrice)}
            </span>
            {priceDisplay.hasDiscount && priceDisplay.oldPrice ? (
              <del className="product-card__old-price line-through text-muted-foreground">
                {formatPrice(priceDisplay.oldPrice)}
              </del>
            ) : null}
          </div>

          {priceDisplay.hasDiscount && priceDisplay.discountAmount ? (
            <p
              className="product-card__save-amount"
              aria-label={`You save ${formatPrice(priceDisplay.discountAmount)}`}
            >
              Save {formatPrice(priceDisplay.discountAmount)}
            </p>
          ) : null}
        </div>

        {product.rating ? (
          <div className="product-card__rating" aria-label={`Rating ${product.rating} out of 5`}>
            <span aria-hidden="true">★</span>
            <span>{product.rating.toFixed(1)}</span>
          </div>
        ) : null}

        <Button
          className="rs-cart-btn product-card__cta"
          onClick={handlePrimaryAction}
          aria-label={
            hasPurchasableVariants
              ? `Select options for ${product.name}`
              : `View details for ${product.name}`
          }
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          {hasPurchasableVariants ? 'Select Options' : 'View Details'}
        </Button>
      </div>
    </article>
  );
});
