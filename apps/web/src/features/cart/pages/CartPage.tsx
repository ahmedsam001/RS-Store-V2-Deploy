import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentMetadata } from '@/shared/seo/use-document-metadata';
import { PATHS } from '@/shared/constants/routes';
import { Button } from '@/shared/components/ui/Button';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { CatalogState } from '@/features/catalog/components/CatalogState';
import { ResponsiveImage } from '@/features/catalog/components/ResponsiveImage';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { formatPrice, getProductUrl } from '@/features/catalog/utils/format';
import { useCart } from '@/features/cart/CartContext';
import { useAuth } from '@/features/auth/AuthContext';

export function CartPage() {
  const { cart, isLoading, error, updateItem, removeItem, clearCart } = useCart();
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useDocumentMetadata({
    title: 'Shopping Cart | RS Store',
    description: 'Review cart products and quantities before checkout',
    canonicalPath: '/cart',
    robots: 'noindex,follow',
  });

  if (isLoading) {
    return <CatalogState title="Loading cart" message="Preparing saved products" />;
  }

  if (error) {
    return <CatalogState title="Failed to load cart" message={error} />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rs-page-stack">
        <EmptyCartContent />
      </div>
    );
  }

  return (
    <div className="rs-page-stack">
      <div className="rs-section-heading text-start">
        <span className="rs-section-kicker">Review Your Order</span>
        <h1 className="rs-heading-1 mt-2">Shopping Cart</h1>
        <p className="mt-2 max-w-lg text-sm leading-7 text-muted-foreground">
          Review products and quantities before creating your order
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-3">
          {cart.items.map((item) => (
            <article key={item.id} className="rs-panel p-3 sm:p-4">
              <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-3 sm:grid-cols-[100px_minmax(0,1fr)_auto]">
                <CatalogLink
                  href={getProductUrl(item.product.slug)}
                  className="overflow-hidden rounded-xl bg-rs-cream-warm"
                  aria-label={`View ${item.product.name}`}
                >
                  {item.product.primaryImage ? (
                    <ResponsiveImage
                      src={item.product.primaryImage.url}
                      alt={item.product.primaryImage.altText ?? item.product.name}
                      className="aspect-square w-full object-cover"
                      widths={[160, 240, 320]}
                      sizes="120px"
                      width={240}
                      height={240}
                    />
                  ) : (
                    <ImageWithFallback
                      src={null}
                      alt={item.product.name}
                      className="aspect-square w-full"
                      fallbackVariant="product"
                    />
                  )}
                </CatalogLink>

                <div className="min-w-0 space-y-2.5">
                  <div>
                    <CatalogLink
                      href={getProductUrl(item.product.slug)}
                      className="line-clamp-2 text-sm font-extrabold leading-5 text-foreground transition hover:text-rs-gold"
                    >
                      {item.product.name}
                    </CatalogLink>
                    {item.variant ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.variant.name}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.originalUnitPrice ? (
                      <span className="text-xs font-semibold text-muted-foreground line-through">
                        {formatPrice(item.originalUnitPrice)}
                      </span>
                    ) : null}
                    <span className="text-sm font-black rs-price-primary">
                      {formatPrice(item.unitPrice)}
                    </span>
                    {item.sale ? (
                      <span className="rounded-full bg-rs-rose-bg px-2 py-0.5 text-[11px] font-extrabold text-rs-rose-dark">
                        Discount {item.sale.discountPercent}%
                      </span>
                    ) : null}
                    {item.sale?.discountAmount ? (
                      <span className="text-[11px] font-extrabold text-rs-green">
                        Save {formatPrice(item.sale.discountAmount)} each
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                      aria-label="Decrease quantity"
                      className="h-9 w-9 rounded-full touch-target"
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <span className="flex h-9 min-w-9 items-center justify-center rounded-full border border-rs-peach bg-rs-cream-warm px-2.5 text-center text-sm font-black">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateItem(item.id, Math.min(99, item.quantity + 1))}
                      aria-label="Increase quantity"
                      className="h-9 w-9 rounded-full touch-target"
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove product"
                      className="h-9 w-9 text-destructive touch-target"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="col-span-2 rounded-xl bg-rs-cream-warm p-3 text-left sm:col-span-1 sm:min-w-28 sm:self-center sm:bg-transparent sm:p-0">
                  <p className="text-[11px] font-semibold text-muted-foreground">Total</p>
                  <p className="break-words text-lg font-black rs-price-primary">
                    {formatPrice(item.lineTotal)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="rs-panel p-4 sm:p-5 lg:sticky lg:top-28">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rs-green-bg text-rs-green">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-black text-rs-ink">Cart Summary</h2>
              <p className="text-[11px] text-muted-foreground">Quick confirmation before payment</p>
            </div>
          </div>
          <div className="mt-5 space-y-2.5 rounded-2xl border border-rs-peach-light bg-rs-cream-warm p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm font-semibold">
              <span>Items</span>
              <span>{cart.summary.itemCount}</span>
            </div>
            <div className="h-px bg-rs-peach-light" />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-lg font-black">
              <span>Total</span>
              <span className="rs-price-primary">{formatPrice(cart.summary.subtotal)}</span>
            </div>
          </div>
          <Button
            type="button"
            className="mt-5 w-full"
            size="lg"
            disabled={status === 'loading'}
            onClick={() => {
              if (user) {
                navigate(PATHS.checkout);
                return;
              }

              navigate(`${PATHS.login}?redirect=${encodeURIComponent(PATHS.checkout)}`, {
                state: { returnTo: PATHS.checkout, reason: 'checkout' },
              });
            }}
          >
            {status === 'loading' ? 'Checking account...' : 'Checkout'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button asChild className="mt-2.5 w-full" variant="outline">
            <CatalogLink href={PATHS.home}>Continue Shopping</CatalogLink>
          </Button>
          <Button
            variant="ghost"
            className="mt-1 w-full text-xs font-semibold text-destructive"
            onClick={clearCart}
          >
            Clear Cart
          </Button>
        </aside>
      </div>
    </div>
  );
}

function EmptyCartContent() {
  return (
    <div className="rs-panel-soft flex min-h-80 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rs-gold-bg text-rs-gold">
        <ShoppingBag className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-rs-ink">Your cart is empty</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Browse our collection and add your favorite products to get started
      </p>
      <div className="mt-6 flex flex-col gap-3 w-full max-w-sm">
        <CatalogLink href={PATHS.home} className="rs-btn-primary">
          Shop Now
        </CatalogLink>
        <CatalogLink href={PATHS.home} className="rs-btn-secondary">
          Continue Shopping
        </CatalogLink>
      </div>
    </div>
  );
}
