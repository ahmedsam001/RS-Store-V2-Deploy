import { ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { CatalogProductDetail, CatalogVariant } from '@/shared/types/CatalogTypes';
import { formatPrice } from '@/features/catalog/utils/format';
import { useAddToCartAction } from '@/features/cart/hooks/use-add-to-cart-action';
import { localizeProductOption, useI18n } from '@/shared/i18n';

type AddToCartPanelProps = {
  product: CatalogProductDetail;
};

export function AddToCartPanel({ product }: AddToCartPanelProps) {
  const { language, t } = useI18n();
  const { addToCart, clearFeedback, error, isAdding, success } = useAddToCartAction({
    successMessage: t('cart.added'),
    errorMessage: t('cart.addFailed'),
  });
  const [quantityInput, setQuantityInput] = useState('1');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const productOutOfStock = product.isInStock === false;

  const availableSizes = useMemo(
    () =>
      product.availableSizes?.filter(Boolean) ??
      uniqueValues(product.variants.map((item) => item.size)),
    [product.availableSizes, product.variants],
  );
  const availableColors = useMemo(
    () =>
      product.availableColors?.filter(Boolean) ??
      uniqueValues(product.variants.map((item) => item.color)),
    [product.availableColors, product.variants],
  );

  const hasVariants = product.variants.length > 0;
  const isPurchasable = hasVariants;
  const requiresSize = hasVariants && availableSizes.length > 0;
  const requiresColor = hasVariants && availableColors.length > 0;
  const canResolveSelectedVariant =
    hasVariants &&
    (!requiresSize || Boolean(selectedSize)) &&
    (!requiresColor || Boolean(selectedColor));
  const selectedVariant = useMemo(
    () =>
      canResolveSelectedVariant
        ? resolveSelectedVariant(product.variants, selectedSize, selectedColor)
        : undefined,
    [canResolveSelectedVariant, product.variants, selectedColor, selectedSize],
  );
  const selectedAvailableStock =
    hasVariants && selectedVariant ? Math.max(0, selectedVariant.stockQuantity) : undefined;
  const isSelectedVariantOutOfStock = selectedAvailableStock === 0;
  const price = selectedVariant?.price ?? product.price;
  const originalPrice = selectedVariant?.originalPrice ?? product.originalPrice;
  const sale = selectedVariant?.sale ?? product.sale;

  function sanitizeQuantity() {
    const num = Number(quantityInput);
    if (!quantityInput || num < 1 || Number.isNaN(num)) {
      setQuantityInput('1');
    }
  }

  function resetFeedback() {
    setValidationError(null);
    clearFeedback();
  }

  async function handleAddToCart() {
    setValidationError(null);
    clearFeedback();
    sanitizeQuantity();

    if (!isPurchasable) {
      setValidationError(t('cart.notPurchasable'));
      return;
    }

    if (requiresSize && !selectedSize) {
      setValidationError(t('cart.selectSizeFirst'));
      return;
    }

    if (requiresColor && !selectedColor) {
      setValidationError(t('cart.selectColorFirst'));
      return;
    }

    const selectedVariantId = selectedVariant?.id;
    if (!selectedVariantId) {
      setValidationError(t('cart.optionUnavailable'));
      return;
    }

    if (isSelectedVariantOutOfStock) {
      setValidationError(formatRemainingStockMessage(0, t));
      return;
    }

    const finalQuantity = Math.max(1, Number(quantityInput) || 1);
    if (typeof selectedAvailableStock === 'number' && finalQuantity > selectedAvailableStock) {
      setValidationError(formatRemainingStockMessage(selectedAvailableStock, t));
      return;
    }

    await addToCart({
      productId: product.id,
      productVariantId: selectedVariantId,
      quantity: finalQuantity,
    });
  }

  return (
    <section className="space-y-4" aria-label={t('cart.addSection')}>
      {requiresColor ? (
        <ChoiceGroup
          title={t('cart.selectColor')}
          options={availableColors}
          selectedValue={selectedColor}
          language={language}
          onSelect={(value) => {
            setSelectedColor(value);
            resetFeedback();
          }}
        />
      ) : null}

      {requiresSize ? (
        <ChoiceGroup
          title={t('cart.selectSize')}
          options={availableSizes}
          selectedValue={selectedSize}
          language={language}
          onSelect={(value) => {
            setSelectedSize(value);
            resetFeedback();
          }}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-end">
        <label className="form-label">
          {t('common.quantity')}
          <Input
            className="mt-2"
            type="number"
            min={1}
            step={1}
            max={selectedAvailableStock ?? 999}
            value={quantityInput}
            onChange={(event) => {
              setQuantityInput(event.target.value);
              resetFeedback();
            }}
            onBlur={sanitizeQuantity}
          />
        </label>
        <div className="rounded-3xl bg-muted/50 px-4 py-3 text-left">
          {sale && originalPrice ? (
            <p className="text-xs font-semibold text-muted-foreground line-through">
              {formatPrice(originalPrice, language)}
            </p>
          ) : null}
          <p className="text-xl font-black text-primary">{formatPrice(price, language)}</p>
          {sale?.discountAmount ? (
            <p className="mt-1 text-xs font-extrabold text-rs-green">
              {t('common.save', { amount: formatPrice(sale.discountAmount, language) })}
            </p>
          ) : null}
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleAddToCart}
        disabled={isAdding || !isPurchasable || isSelectedVariantOutOfStock || productOutOfStock}
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        {isAdding
          ? t('cart.adding')
          : !isPurchasable
            ? t('cart.unavailable')
            : productOutOfStock
              ? t('cart.outOfStock')
              : isSelectedVariantOutOfStock
                ? t('cart.outOfStock')
                : t('cart.addToCart')}
      </Button>
      {!isPurchasable ? (
        <p className="text-sm font-semibold leading-6 text-destructive" role="alert">
          {t('cart.notPurchasable')}
        </p>
      ) : productOutOfStock ? (
        <p className="text-sm font-semibold leading-6 text-destructive" role="alert">
          {t('cart.currentlyOutOfStock')}
        </p>
      ) : isSelectedVariantOutOfStock ? (
        <p className="text-sm font-semibold leading-6 text-destructive" role="alert">
          {formatRemainingStockMessage(0, t)}
        </p>
      ) : null}
      {validationError ? (
        <p className="text-sm font-semibold leading-6 text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold leading-6 text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-semibold leading-6 text-rs-green" role="status">
          {success}
        </p>
      ) : null}
    </section>
  );
}

function ChoiceGroup({
  onSelect,
  options,
  selectedValue,
  language,
  title,
}: {
  language: ReturnType<typeof useI18n>['language'];
  onSelect: (value: string) => void;
  options: string[];
  selectedValue: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
        {options.map((option) => {
          const isSelected = selectedValue === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              className={
                isSelected
                  ? 'max-w-full break-words rounded-full border border-rs-ink bg-rs-ink px-3 py-1.5 text-xs font-extrabold text-white transition'
                  : 'max-w-full break-words rounded-full border border-rs-peach bg-rs-cream-warm px-3 py-1.5 text-xs font-extrabold text-muted-foreground transition hover:border-rs-ink hover:text-rs-ink'
              }
            >
              {localizeProductOption(option, language)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function resolveSelectedVariant(
  variants: CatalogVariant[],
  selectedSize: string,
  selectedColor: string,
): CatalogVariant | undefined {
  if (variants.length === 0) return undefined;

  const matchingVariants = variants.filter((variant) => {
    const matchesSize = selectedSize ? variant.size === selectedSize : true;
    const matchesColor = selectedColor ? variant.color === selectedColor : true;
    return matchesSize && matchesColor;
  });

  return matchingVariants.find((variant) => variant.stockQuantity > 0) ?? matchingVariants[0];
}

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function formatRemainingStockMessage(
  availableStock: number,
  t: ReturnType<typeof useI18n>['t'],
): string {
  return t('cart.onlyLeft', { count: availableStock });
}
