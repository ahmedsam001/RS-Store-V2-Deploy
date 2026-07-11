import type { Cart } from '@/shared/types/CartTypes';

export type CheckoutCartBlockCode = 'preview-cart' | 'static-product';

export function getCheckoutCartBlockCode(
  cart: Cart | null,
): CheckoutCartBlockCode | null {
  if (!cart?.items.length) return null;

  if (cart.id === 'preview-cart') {
    return 'preview-cart';
  }

  const hasStaticProduct = cart.items.some((item) => {
    if (item.type === 'CUSTOM_ORDER') return false;

    return (
      !isDatabaseId(item.product?.id) ||
      (item.variant?.id ? !isDatabaseId(item.variant.id) : false)
    );
  });

  return hasStaticProduct ? 'static-product' : null;
}

function isDatabaseId(value: string | null | undefined): boolean {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
  );
}
