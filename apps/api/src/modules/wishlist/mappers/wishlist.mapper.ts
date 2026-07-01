import { Prisma } from '@prisma/client';
import { minorUnitsToMoneyString } from '../../../common/money/money';
import { ProductPricingService, ProductPricingDetail } from '../../pricing/product-pricing.service';
import { WishlistMoney, WishlistResponse, WishlistSale } from '../types/wishlist-response.types';

export const wishlistItemInclude = {
  product: {
    include: {
      images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }], take: 1 },
    },
  },
} satisfies Prisma.WishlistItemInclude;

export type WishlistPayload = Prisma.WishlistGetPayload<{ include: { items: { include: typeof wishlistItemInclude } } }>;

export async function mapWishlist(wishlist: WishlistPayload, pricingService: ProductPricingService): Promise<WishlistResponse> {
  const saleAdjustments = await pricingService.getActiveSaleAdjustments(wishlist.items.map((item) => item.productId));

  return {
    id: wishlist.id,
    items: wishlist.items.map((item) => {
      const image = item.product.images[0];
      const input = {
        productId: item.productId,
        baseAmount: item.product.priceAmount,
        productDiscountPercent: Number(item.product.discountPercent ?? 0),
        currency: item.product.currency,
      };
      const pricing = pricingService.resolveProductPricing(input, saleAdjustments.get(item.productId));
      const currency = item.product.currency;

      return {
        id: item.id,
        product: {
          id: item.product.id,
          slug: item.product.slug,
          name: item.product.nameAr,
          sku: item.product.sku,
          price: money(pricing.finalPriceAmount, currency),
          originalPrice: pricing.priceSource !== 'NONE' ? money(pricing.basePriceAmount, currency) : null,
          sale: mapSale(currency, pricing),
          primaryImage: image ? { id: image.id, url: image.secureUrl, altText: image.altTextAr ?? null } : null,
        },
        createdAt: item.createdAt.toISOString(),
      };
    }),
    summary: { itemCount: wishlist.items.length },
  };
}

function mapSale(currency: string, pricing: ProductPricingDetail): WishlistSale | null {
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

function money(amount: number, currency: string): WishlistMoney {
  return { amount: minorUnitsToMoneyString(amount), currency };
}