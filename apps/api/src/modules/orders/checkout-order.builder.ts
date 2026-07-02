import { BadRequestException } from '@nestjs/common';
import { Prisma, ProductStatus, ProductVariantStatus } from '@prisma/client';
import { ProductPricingService, SaleAdjustment } from '../pricing/product-pricing.service';

type PrismaClientLike = Prisma.TransactionClient;

export type CheckoutCart = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        productVariant: true;
      };
    };
  };
}>;

export type CheckoutCartItem = CheckoutCart['items'][number];

const visibleProductWhere = {
  status: ProductStatus.ACTIVE,
  deletedAt: null,
  category: { isActive: true, deletedAt: null },
} satisfies Prisma.ProductWhereInput;

export async function assertCheckoutItems(
  client: PrismaClientLike,
  items: CheckoutCartItem[],
): Promise<void> {
  for (const item of items) {
    const product = await client.product.findFirst({
      where: { id: item.productId, ...visibleProductWhere },
      select: { id: true },
    });
    if (!product) {
      throw new BadRequestException('Cart contains an unavailable product');
    }

    const activeVariantWhere = {
      productId: item.productId,
      deletedAt: null,
      status: ProductVariantStatus.ACTIVE,
      isActive: true,
    } satisfies Prisma.ProductVariantWhereInput;

    if (!item.productVariantId) {
      const activeVariantCount = await client.productVariant.count({ where: activeVariantWhere });
      if (activeVariantCount > 0) {
        throw new BadRequestException('Cart item is missing a selected product variant');
      }
      throw new BadRequestException('Product is not configured with purchasable stock');
    }

    const variant = await client.productVariant.findFirst({
      where: {
        ...activeVariantWhere,
        id: item.productVariantId,
      },
      select: { id: true, stockQuantity: true, reservedQuantity: true },
    });
    if (!variant || variant.stockQuantity - variant.reservedQuantity < item.quantity) {
      throw new BadRequestException('Cart contains an unavailable product variant');
    }
  }
}

export function resolveOrderCurrency(items: CheckoutCartItem[]): string {
  const currency = items[0]?.product.currency ?? 'EGP';
  if (items.some((item) => item.product.currency !== currency)) {
    throw new BadRequestException('Cart contains multiple currencies');
  }

  return currency;
}

export function toOrderItemInput(
  item: CheckoutCartItem,
  pricingService: ProductPricingService,
  saleAdjustments: Map<string, SaleAdjustment>,
): Prisma.OrderItemCreateWithoutOrderInput {
  const baseAmount = item.productVariant?.priceAmount ?? item.product.priceAmount;
  const productDiscountPercent = Number(item.product.discountPercent ?? 0);
  const input = {
    productId: item.productId,
    baseAmount,
    productDiscountPercent,
    currency: item.product.currency,
  };
  const pricing = pricingService.resolveProductPricing(input, saleAdjustments.get(item.productId));

  return {
    product: { connect: { id: item.productId } },
    productVariant: item.productVariantId ? { connect: { id: item.productVariantId } } : undefined,
    productNameSnapshot: item.product.nameAr,
    productSkuSnapshot: item.productVariant?.sku ?? item.product.sku,
    productVariantNameSnapshot: item.productVariant?.nameAr ?? null,
    productVariantSkuSnapshot: item.productVariant?.sku ?? null,
    productVariantSizeSnapshot: item.productVariant?.size ?? null,
    productVariantColorSnapshot: item.productVariant?.color ?? null,
    quantity: item.quantity,
    unitPriceAmount: pricing.finalPriceAmount,
    lineTotalAmount: pricing.finalPriceAmount * item.quantity,
  };
}
