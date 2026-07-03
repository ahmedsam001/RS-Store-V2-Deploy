import { BadRequestException } from '@nestjs/common';
import { CustomOrderStatus, Prisma, ProductStatus, ProductVariantStatus } from '@prisma/client';
import { ProductPricingService, SaleAdjustment } from '../pricing/product-pricing.service';

type PrismaClientLike = Prisma.TransactionClient;

export type CheckoutCart = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        productVariant: true;
        customOrderRequest: true;
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
    if (item.customOrderRequestId) {
      const customOrder = item.customOrderRequest;
      if (
        !customOrder ||
        customOrder.status !== CustomOrderStatus.ACCEPTED ||
        customOrder.convertedOrderId ||
        !customOrder.adminTitle ||
        customOrder.adminTotalAmount === null ||
        customOrder.adminTotalAmount <= 0
      ) {
        throw new BadRequestException('Cart contains an unavailable custom order');
      }
      continue;
    }

    if (!item.productId || !item.product) {
      throw new BadRequestException('Cart item is missing product details');
    }

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
  const currencies = items.map((item) =>
    item.customOrderRequestId ? 'EGP' : (item.product?.currency ?? 'EGP'),
  );
  const currency = currencies[0] ?? 'EGP';
  if (currencies.some((itemCurrency) => itemCurrency !== currency)) {
    throw new BadRequestException('Cart contains multiple currencies');
  }

  return currency;
}

export function toOrderItemInput(
  item: CheckoutCartItem,
  pricingService: ProductPricingService,
  saleAdjustments: Map<string, SaleAdjustment>,
): Prisma.OrderItemCreateWithoutOrderInput {
  if (item.customOrderRequestId) {
    const customOrder = item.customOrderRequest;
    if (!customOrder?.adminTitle || customOrder.adminTotalAmount === null) {
      throw new BadRequestException('Custom order is missing final product details');
    }

    const quantity = Math.max(1, item.quantity);
    const unitPriceAmount =
      quantity > 1
        ? Math.floor(customOrder.adminTotalAmount / quantity)
        : customOrder.adminTotalAmount;

    return {
      productNameSnapshot: customOrder.adminTitle,
      productSkuSnapshot: `CUSTOM-${customOrder.id.slice(0, 8).toUpperCase()}`,
      productVariantNameSnapshot: null,
      productVariantSkuSnapshot: null,
      productVariantSizeSnapshot: customOrder.requestedSize,
      productVariantColorSnapshot: customOrder.requestedColor,
      quantity: item.quantity,
      unitPriceAmount,
      lineTotalAmount: customOrder.adminTotalAmount,
    };
  }

  if (!item.productId || !item.product) {
    throw new BadRequestException('Cart item is missing product details');
  }

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
