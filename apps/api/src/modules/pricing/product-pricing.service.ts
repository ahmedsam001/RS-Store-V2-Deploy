import { Injectable } from '@nestjs/common';
import { FlashSaleStatus, Prisma, ProductStatus } from '@prisma/client';
import { calculatePercentDiscountMinorUnits, percentToBasisPoints } from '../../common/money/money';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

export type ProductPricingDetail = {
  basePriceAmount: number;
  discountPercent: number;
  discountAmount: number;
  salePriceAmount: number;
  finalPriceAmount: number;
  currency: string;
  priceSource: 'FLASH_SALE' | 'PRODUCT_DISCOUNT' | 'NONE';
  saleId: string | null;
  saleTitle: string | null;
};

export type ProductPricingInput = {
  productId: string;
  baseAmount: number;
  productDiscountPercent: number;
  currency: string;
};

export type SaleAdjustment = {
  flashSaleId: string;
  titleAr: string;
  discountPercent: string;
  discountBasisPoints: number;
};

export type PricedAmount = {
  originalAmount: number;
  finalAmount: number;
  discountAmount: number;
  sale: SaleAdjustment | null;
};

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ProductPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveSaleAdjustments(productIds: string[], client: PrismaClientLike = this.prisma): Promise<Map<string, SaleAdjustment>> {
    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const now = new Date();
    const rows = await client.flashSaleProduct.findMany({
      where: {
        productId: { in: uniqueIds },
        flashSale: {
          status: FlashSaleStatus.ACTIVE,
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
        product: {
          status: ProductStatus.ACTIVE,
          deletedAt: null,
          category: { isActive: true, deletedAt: null },
        },
      },
      include: { flashSale: true },
    });

    const adjustments = new Map<string, SaleAdjustment>();
    for (const row of rows) {
      const discountPercent = row.flashSale.discountPercent.toString();
      const candidate: SaleAdjustment = {
        flashSaleId: row.flashSaleId,
        titleAr: row.flashSale.titleAr,
        discountPercent,
        discountBasisPoints: percentToBasisPoints(discountPercent),
      };
      const current = adjustments.get(row.productId);
      if (!current || candidate.discountBasisPoints > current.discountBasisPoints) {
        adjustments.set(row.productId, candidate);
      }
    }

    return adjustments;
  }

  resolveProductPricing(
    input: ProductPricingInput,
    saleAdjustment: SaleAdjustment | undefined | null,
  ): ProductPricingDetail {
    const { baseAmount, productDiscountPercent, currency } = input;
    const flashSalePrice = this.calculateSalePrice(baseAmount, saleAdjustment);
    const productDiscountPrice = this.calculateProductDiscountPrice(baseAmount, productDiscountPercent);

    // Priority: Flash sale > Product discount > None
    if (saleAdjustment && flashSalePrice.finalAmount < baseAmount) {
      return {
        basePriceAmount: baseAmount,
        discountPercent: Number(saleAdjustment.discountPercent),
        discountAmount: flashSalePrice.discountAmount,
        salePriceAmount: flashSalePrice.finalAmount,
        finalPriceAmount: flashSalePrice.finalAmount,
        currency,
        priceSource: 'FLASH_SALE',
        saleId: saleAdjustment.flashSaleId,
        saleTitle: saleAdjustment.titleAr || 'Flash Sale',
      };
    }

    if (productDiscountPercent > 0) {
      return {
        basePriceAmount: baseAmount,
        discountPercent: productDiscountPercent,
        discountAmount: productDiscountPrice.discountAmount,
        salePriceAmount: productDiscountPrice.finalAmount,
        finalPriceAmount: productDiscountPrice.finalAmount,
        currency,
        priceSource: 'PRODUCT_DISCOUNT',
        saleId: 'product-discount',
        saleTitle: 'Product discount',
      };
    }

    return {
      basePriceAmount: baseAmount,
      discountPercent: 0,
      discountAmount: 0,
      salePriceAmount: baseAmount,
      finalPriceAmount: baseAmount,
      currency,
      priceSource: 'NONE',
      saleId: null,
      saleTitle: null,
    };
  }

  private calculateSalePrice(
    baseAmount: number,
    sale: SaleAdjustment | undefined | null,
  ): PricedAmount {
    if (!sale) {
      return { originalAmount: baseAmount, finalAmount: baseAmount, discountAmount: 0, sale: null };
    }

    const discountAmount = calculatePercentDiscountMinorUnits(baseAmount, sale.discountPercent);
    const finalAmount = Math.max(0, baseAmount - discountAmount);
    return { originalAmount: baseAmount, finalAmount, discountAmount, sale };
  }

  private calculateProductDiscountPrice(
    baseAmount: number,
    discountPercent: number,
  ): PricedAmount {
    if (discountPercent <= 0) {
      return { originalAmount: baseAmount, finalAmount: baseAmount, discountAmount: 0, sale: null };
    }

    const discountAmount = calculatePercentDiscountMinorUnits(baseAmount, String(discountPercent));
    const finalAmount = Math.max(0, baseAmount - discountAmount);
    const sale: SaleAdjustment = {
      flashSaleId: 'product-discount',
      titleAr: 'Product discount',
      discountPercent: String(discountPercent),
      discountBasisPoints: percentToBasisPoints(String(discountPercent)),
    };
    return { originalAmount: baseAmount, finalAmount, discountAmount, sale };
  }
}