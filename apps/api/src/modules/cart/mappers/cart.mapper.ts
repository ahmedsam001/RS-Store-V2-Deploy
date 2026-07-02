import { Prisma } from '@prisma/client';
import { minorUnitsToMoneyString } from '../../../common/money/money';
import { ProductPricingService, ProductPricingDetail } from '../../pricing/product-pricing.service';
import { CartItemResponse, CartMoney, CartResponse, CartSale } from '../types/cart-response.types';

export const cartItemInclude = {
  product: {
    include: {
      images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 },
    },
  },
  productVariant: true,
} satisfies Prisma.CartItemInclude;

export type CartPayload = Prisma.CartGetPayload<{
  include: { items: { include: typeof cartItemInclude } };
}>;
export type CartItemPayload = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

export async function mapCart(
  cart: CartPayload,
  pricingService: ProductPricingService,
): Promise<CartResponse> {
  const saleAdjustments = await pricingService.getActiveSaleAdjustments(
    cart.items.map((item) => item.productId),
  );
  const pricedItems = cart.items.map((item) => mapCartItem(item, pricingService, saleAdjustments));
  const currency = pricedItems[0]?.response.unitPrice.currency ?? 'EGP';
  const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotalAmount, 0);
  const items = pricedItems.map((item) => item.response);

  return {
    id: cart.id,
    items,
    summary: {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: { amount: minorUnitsToMoneyString(subtotal), currency },
    },
  };
}

function mapCartItem(
  item: CartItemPayload,
  pricingService: ProductPricingService,
  saleAdjustments: Map<
    string,
    { flashSaleId: string; titleAr: string; discountPercent: string; discountBasisPoints: number }
  >,
): { response: CartItemResponse; lineTotalAmount: number } {
  const baseAmount = item.productVariant?.priceAmount ?? item.product.priceAmount;
  const productDiscountPercent = Number(item.product.discountPercent ?? 0);
  const input = {
    productId: item.productId,
    baseAmount,
    productDiscountPercent,
    currency: item.product.currency,
  };
  const pricing = pricingService.resolveProductPricing(input, saleAdjustments.get(item.productId));
  const currency = item.product.currency;
  const image = item.product.images[0];
  const lineTotalAmount = pricing.finalPriceAmount * item.quantity;
  const unitPrice = money(pricing.finalPriceAmount, currency);
  const originalUnitPrice =
    pricing.priceSource !== 'NONE' ? money(pricing.basePriceAmount, currency) : null;
  const sale = mapSale(currency, pricing);

  return {
    lineTotalAmount,
    response: {
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product.id,
        slug: item.product.slug,
        name: item.product.nameAr,
        sku: item.product.sku,
        price: unitPrice,
        originalPrice: originalUnitPrice,
        sale,
        primaryImage: image
          ? { id: image.id, url: image.secureUrl, altText: image.altTextAr ?? null }
          : null,
      },
      variant: item.productVariant
        ? {
            id: item.productVariant.id,
            name: item.productVariant.nameAr,
            sku: item.productVariant.sku,
            price: unitPrice,
            originalPrice: originalUnitPrice,
            sale,
          }
        : null,
      unitPrice,
      originalUnitPrice,
      sale,
      lineTotal: money(lineTotalAmount, currency),
    },
  };
}

function mapSale(currency: string, pricing: ProductPricingDetail): CartSale | null {
  if (pricing.priceSource === 'NONE') {
    return null;
  }

  return {
    flashSaleId: pricing.saleId ?? 'product-discount',
    title: pricing.saleTitle ?? 'Product discount',
    discountPercent: pricing.discountPercent.toString(),
    originalPrice: money(pricing.basePriceAmount, currency),
    discountAmount: money(pricing.discountAmount, currency),
  };
}

function money(amount: number, currency: string): CartMoney {
  return { amount: minorUnitsToMoneyString(amount), currency };
}
