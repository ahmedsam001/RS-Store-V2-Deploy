import test from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { CustomOrderStatus } from '@prisma/client';
import {
  assertCheckoutItems,
  CheckoutCartItem,
  resolveOrderCurrency,
  toOrderItemInput,
} from '../src/modules/orders/checkout-order.builder';
import { ProductPricingService } from '../src/modules/pricing/product-pricing.service';

function makeCustomCartItem(overrides: Partial<CheckoutCartItem> = {}): CheckoutCartItem {
  const customOrderId = '12345678-1234-1234-1234-123456789abc';

  return {
    id: 'cart-item-1',
    cartId: 'cart-1',
    productId: null,
    productVariantId: null,
    customOrderRequestId: customOrderId,
    quantity: 2,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    product: null,
    productVariant: null,
    customOrderRequest: {
      id: customOrderId,
      userId: 'user-1',
      productUrl: 'https://example.com/custom-product',
      customerImageUrl: null,
      requestedSize: 'M',
      requestedColor: 'Black',
      quantity: 2,
      notes: null,
      status: CustomOrderStatus.ACCEPTED,
      adminTitle: 'Custom evening dress',
      adminImageUrl: null,
      adminNote: null,
      productPriceAmount: 1200,
      shippingAmount: 300,
      adminTotalAmount: 1500,
      convertedOrderId: null,
      reviewedById: 'admin-1',
      reviewedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    ...overrides,
  } as unknown as CheckoutCartItem;
}

test('builds order item input for accepted custom cart item', async () => {
  const item = makeCustomCartItem();
  const client = {
    product: { findFirst: async () => assert.fail('custom items must not query products') },
    productVariant: { count: async () => assert.fail('custom items must not query variants') },
  };

  await assert.doesNotReject(() => assertCheckoutItems(client as never, [item]));
  assert.equal(resolveOrderCurrency([item]), 'EGP');

  const input = toOrderItemInput(item, {} as ProductPricingService, new Map());

  assert.equal(input.productNameSnapshot, 'Custom evening dress');
  assert.equal(input.productSkuSnapshot, 'CUSTOM-12345678');
  assert.equal(input.productVariantSizeSnapshot, 'M');
  assert.equal(input.productVariantColorSnapshot, 'Black');
  assert.equal(input.quantity, 2);
  assert.equal(input.unitPriceAmount, 750);
  assert.equal(input.lineTotalAmount, 1500);
});

test('rejects unavailable custom cart item during checkout validation', async () => {
  const item = makeCustomCartItem({
    customOrderRequest: {
      ...makeCustomCartItem().customOrderRequest!,
      convertedOrderId: 'order-1',
    },
  } as Partial<CheckoutCartItem>);

  await assert.rejects(
    () => assertCheckoutItems({} as never, [item]),
    (error) =>
      error instanceof BadRequestException &&
      error.message === 'Cart contains an unavailable custom order',
  );
});
