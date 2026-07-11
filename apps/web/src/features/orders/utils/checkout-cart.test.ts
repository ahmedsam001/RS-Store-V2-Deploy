import { describe, expect, it } from 'vitest';
import { createMockCart } from '@/test/test-utils';
import { getCheckoutCartBlockCode } from '@/features/orders/utils/checkout-cart';

const databaseProductId = '11111111-1111-4111-8111-111111111111';
const databaseVariantId = '22222222-2222-4222-8222-222222222222';

function createProductItem(productId = databaseProductId) {
  return {
    id: 'product-cart-item',
    type: 'PRODUCT' as const,
    quantity: 1,
    product: {
      id: productId,
      slug: 'live-product',
      name: 'Live product',
      sku: 'LIVE-1',
      price: { amount: '100.00', currency: 'EGP' },
      originalPrice: null,
      sale: null,
      primaryImage: null,
    },
    variant: {
      id: databaseVariantId,
      name: 'Default',
      sku: 'LIVE-1-V',
      price: null,
      originalPrice: null,
      sale: null,
    },
    customOrder: null,
    unitPrice: { amount: '100.00', currency: 'EGP' },
    originalUnitPrice: null,
    sale: null,
    lineTotal: { amount: '100.00', currency: 'EGP' },
  };
}

function createCustomOrderItem() {
  return {
    id: 'custom-cart-item',
    type: 'CUSTOM_ORDER' as const,
    quantity: 2,
    product: null,
    variant: null,
    customOrder: {
      id: 'custom-order',
      productUrl: 'https://example.com/product',
      title: 'Accepted custom order',
      imageUrl: null,
      requestedColor: null,
      requestedSize: null,
      adminNote: null,
    },
    unitPrice: { amount: '200.00', currency: 'EGP' },
    originalUnitPrice: null,
    sale: null,
    lineTotal: { amount: '400.00', currency: 'EGP' },
  };
}

describe('getCheckoutCartBlockCode', () => {
  it('allows accepted custom order items through checkout validation', () => {
    const cart = createMockCart({ items: [createCustomOrderItem()] });
    expect(getCheckoutCartBlockCode(cart)).toBeNull();
  });

  it('allows a mixed cart when regular products use database IDs', () => {
    const cart = createMockCart({
      items: [createProductItem(), createCustomOrderItem()],
    });
    expect(getCheckoutCartBlockCode(cart)).toBeNull();
  });

  it('blocks static preview products but not custom orders', () => {
    const cart = createMockCart({
      items: [createProductItem('static-product')],
    });
    expect(getCheckoutCartBlockCode(cart)).toBe('static-product');
  });

  it('blocks the preview cart', () => {
    const cart = createMockCart({
      id: 'preview-cart',
      items: [createCustomOrderItem()],
    });
    expect(getCheckoutCartBlockCode(cart)).toBe('preview-cart');
  });
});
