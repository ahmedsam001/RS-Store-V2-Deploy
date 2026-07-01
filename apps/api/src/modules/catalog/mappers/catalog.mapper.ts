import { Category, Prisma, ProductVariantStatus } from '@prisma/client';
import { minorUnitsToMoneyString } from '../../../common/money/money';
import { ProductPricingService, ProductPricingInput, ProductPricingDetail } from '../../pricing/product-pricing.service';
import {
  CatalogCategory,
  CatalogImage,
  CatalogProductCard,
  CatalogProductDetail,
  CatalogSale,
  CatalogVariant,
  CatalogSubCategory,
  FeaturedSubCategory,
} from '../types/catalog-response.types';

const productCardInclude = {
  category: true,
  subCategoryRef: true,
  images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
  variants: { where: { isActive: true, status: ProductVariantStatus.ACTIVE, deletedAt: null }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.ProductInclude;

export type CatalogProductPayload = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

export const catalogProductInclude = productCardInclude;

export type CatalogPricingContext = {
  pricingService: ProductPricingService;
  saleAdjustments: Map<string, { flashSaleId: string; titleAr: string; discountPercent: string; discountBasisPoints: number }>;
};

export function mapCategory(
  category: Category & { parent?: Pick<Category, 'slug' | 'nameAr'> | null },
  productCount: number,
  subCategoryItems: Array<{ id: string; slug: string; name: string; count: number; image: string | null }> = [],
): CatalogCategory {
  const subCategories: CatalogSubCategory[] = subCategoryItems.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    productCount: item.count,
    image: item.image,
  }));

  return {
    id: category.id,
    slug: category.slug,
    name: category.nameAr,
    description: category.description,
    productCount,
    image: category.image ?? null,
    parentCategorySlug: category.parent?.slug ?? null,
    parentCategoryName: category.parent?.nameAr ?? null,
    subCategories: subCategories.length > 0 ? subCategories : undefined,
  };
}
export function mapFeaturedSubCategory(
  category: Category & { _count: { subCategoryProducts: number }; parent?: Category | null },
): FeaturedSubCategory {
  return {
    id: category.id,
    nameAr: category.nameAr,
    nameEn: category.nameEn,
    slug: category.slug,
    image: category.image,
    parentCategorySlug: category.parent?.slug ?? '',
    parentCategoryName: category.parent?.nameAr ?? '',
    productsCount: category._count.subCategoryProducts,
  };
}

export function mapProductCard(product: CatalogProductPayload, context: CatalogPricingContext): CatalogProductCard {
  const pricing = resolveProductPricing(product, product.priceAmount, context);
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.nameAr,
    description: product.description,
    sourceSheinUrl: product.sourceSheinUrl,
    price: { amount: minorUnitsToMoneyString(pricing.finalPriceAmount), currency: product.currency },
    originalPrice: pricing.priceSource !== 'NONE' ? { amount: minorUnitsToMoneyString(pricing.basePriceAmount), currency: product.currency } : null,
    sale: mapSale(product.currency, pricing),
    subCategory: product.subCategoryRef?.nameAr ?? product.subCategory ?? null,
    discount: pricing.discountPercent,
    rating: Number(product.rating ?? 0),
    category: product.category
      ? {
          id: product.category.id,
          slug: product.category.slug,
          name: product.category.nameAr,
          description: product.category.description,
          image: product.category.image ?? null,
        }
      : null,
    primaryImage: mapImage(product.images[0]),
    imageCount: product.images.length,
    variantCount: product.variants.length,
    createdAt: product.createdAt.toISOString(),
    isInStock: product.isInStock,
  };
}

export function mapProductDetail(product: CatalogProductPayload, context: CatalogPricingContext): CatalogProductDetail {
  return {
    ...mapProductCard(product, context),
    images: product.images.map((image) => mapImage(image)).filter(Boolean) as CatalogImage[],
    variants: product.variants.map((variant) => mapVariant(variant, product, product.currency, context)),
  };
}

export function resolveProductPricing(
  product: CatalogProductPayload,
  baseAmount: number,
  context: CatalogPricingContext,
): ProductPricingDetail {
  const input: ProductPricingInput = {
    productId: product.id,
    baseAmount,
    productDiscountPercent: Number(product.discountPercent ?? 0),
    currency: product.currency,
  };
  const saleAdjustment = context.saleAdjustments.get(product.id);
  return context.pricingService.resolveProductPricing(input, saleAdjustment);
}

export function mapSale(currency: string, pricing: ProductPricingDetail): CatalogSale | null {
  if (pricing.priceSource === 'NONE') {
    return null;
  }

  return {
    flashSaleId: pricing.saleId ?? 'product-discount',
    title: pricing.saleTitle ?? 'Product discount',
    discountPercent: pricing.discountPercent.toString(),
    originalPrice: { amount: minorUnitsToMoneyString(pricing.basePriceAmount), currency },
    discountAmount: { amount: minorUnitsToMoneyString(pricing.discountAmount), currency },
  };
}

function mapImage(image: CatalogProductPayload['images'][number] | undefined): CatalogImage | null {
  if (!image) {
    return null;
  }

  return {
    id: image.id,
    url: image.secureUrl,
    width: image.width ?? null,
    height: image.height ?? null,
    altText: image.altTextAr ?? null,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

export function mapVariant(
  variant: CatalogProductPayload['variants'][number],
  product: CatalogProductPayload,
  currency: string,
  context: CatalogPricingContext,
): CatalogVariant {
  const baseAmount = variant.priceAmount ?? product.priceAmount;
  const pricing = resolveProductPricing(product, baseAmount, context);
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.nameAr,
    price: { amount: minorUnitsToMoneyString(pricing.finalPriceAmount), currency },
    originalPrice: pricing.priceSource !== 'NONE' ? { amount: minorUnitsToMoneyString(pricing.basePriceAmount), currency } : null,
    sale: mapSale(currency, pricing),
    sortOrder: variant.sortOrder,
    size: variant.size ?? null,
    color: variant.color ?? null,
    stockQuantity: Math.max(0, variant.stockQuantity - variant.reservedQuantity),
    status: variant.status,
  };
}
