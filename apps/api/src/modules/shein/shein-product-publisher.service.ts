import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  ImageSource,
  Prisma,
  ProductStatus,
  ProductVariantStatus,
  SheinImportStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { moneyStringToMinorUnits } from '../../common/money/money';
import { logStructured } from '../../common/logging/structured-logger';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { SHEIN_MAX_PRODUCT_IMAGES, isLikelyProductImage } from './shein-image-filter';
import { SheinPreviewNormalizer } from './shein-preview.normalizer';
import { assertValidSheinSubCategory, normalizeSheinMainCategory } from './shein-category-config';
import { SheinUrlService } from './shein-url.service';
import { SheinImportPreview, SheinPublishOptions } from './shein.types';
import { FIXED_SHEIN_CURRENCY } from './shein-marketplace';
import { SheinMarketplaceSettingsService } from './shein-marketplace-settings.service';
import { SheinWorkflowService } from './shein-workflow.service';

const SHEIN_IMAGE_FOLDER = 'rs-store/shein-imports';

type UploadedSheinProductImage = {
  cloudinaryPublicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  byteSize?: number;
  format?: string;
  altTextAr?: string;
  isPrimary?: boolean;
  source?: ImageSource;
};

type SheinPublishPricingSettings = {
  exchangeRate: number;
  storeCurrency: string;
};

type ResolvedSheinSubCategory = {
  id?: string;
  name?: string;
};

@Injectable()
export class SheinProductPublisherService {
  private readonly include = {
    requestedBy: { select: { id: true, name: true, email: true } },
    createdProduct: { select: { id: true, nameAr: true, slug: true } },
  } satisfies Prisma.SheinImportInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly normalizer: SheinPreviewNormalizer,
    private readonly workflow: SheinWorkflowService,
    private readonly urlService: SheinUrlService,
    private readonly marketplaceSettings: SheinMarketplaceSettingsService,
  ) {}

  async createProduct(importId: string, options: SheinPublishOptions) {
    const importRecord = await this.prisma.sheinImport.findUniqueOrThrow({
      where: { id: importId },
    });
    const marketplace = await this.marketplaceSettings.getSettings();

    // Idempotency: If product already created and linked, return it directly
    if (
      importRecord.status === SheinImportStatus.PRODUCT_CREATED &&
      importRecord.createdProductId
    ) {
      if (options.publishStatus === ProductStatus.ACTIVE) {
        return this.publishExistingDraft(importRecord.id, importRecord.createdProductId);
      }
      // Already created as draft - return existing record without duplicate
      return this.prisma.sheinImport.findUniqueOrThrow({
        where: { id: importId },
        include: this.include,
      });
    }

    const canRecoverMissingCreatedProduct =
      importRecord.status === SheinImportStatus.PRODUCT_CREATED && !importRecord.createdProductId;
    if (!canRecoverMissingCreatedProduct) {
      this.workflow.assertCanCreateProduct(importRecord.status);
    }

    const payload = this.normalizer.normalize(
      options.editedPayload ??
        importRecord.editedPayload ??
        importRecord.previewPayload ??
        importRecord.rawPayload ??
        {},
      importRecord.sourceUrl,
      { strictImages: Boolean(options.editedPayload), marketplace },
    );
    this.validateProductRequiredFields(payload);
    this.validateProductImages(payload);
    await this.assertCategoryMatchesMainCategory(payload);
    await this.prisma.sheinImport.update({
      where: { id: importId },
      data: { status: SheinImportStatus.PROCESSING },
    });
    const uploadedPublicIds: string[] = [];

    try {
      const pricingSettings = await this.getPublishPricingSettings(payload.exchangeRate);
      const storePriceAmount = this.calculateStorePriceAmount(
        payload.priceAmount,
        pricingSettings.exchangeRate,
      );
      const normalizedPayload = {
        ...payload,
        exchangeRate: pricingSettings.exchangeRate,
        storePriceAmount,
      };
      const uploadedImages: UploadedSheinProductImage[] = [];
      for (const image of normalizedPayload.images) {
        if (image.cloudinaryPublicId) {
          uploadedImages.push({
            cloudinaryPublicId: image.cloudinaryPublicId,
            secureUrl: image.url,
            width: image.width,
            height: image.height,
            byteSize: image.byteSize,
            format: image.format,
            altTextAr: image.altTextAr,
            isPrimary: image.isPrimary,
            source: ImageSource.ADMIN_UPLOAD,
          });
          continue;
        }
        const safeImageUrl = this.urlService.assertAllowedSheinImageUrl(image.url).toString();
        try {
          const uploaded = await this.uploadsService.uploadRemoteImage(
            safeImageUrl,
            SHEIN_IMAGE_FOLDER,
          );
          uploadedPublicIds.push(uploaded.cloudinaryPublicId);
          uploadedImages.push({
            ...uploaded,
            altTextAr: image.altTextAr,
            isPrimary: image.isPrimary,
            source: ImageSource.SHEIN_IMPORT,
          });
        } catch (error) {
          logStructured('warn', 'shein_remote_image_upload_failed', {
            importId,
            imageUrl: safeImageUrl,
            reason: this.errorMessage(error),
          });
          uploadedImages.push({
            cloudinaryPublicId: this.remoteImagePublicId(importId, safeImageUrl),
            secureUrl: safeImageUrl,
            altTextAr: image.altTextAr,
            isPrimary: image.isPrimary,
            source: ImageSource.SHEIN_IMPORT,
          });
        }
      }

      return await this.prisma.$transaction(async (tx) => {
        const safePayload = {
          ...normalizedPayload,
          slug: await this.resolveUniqueProductSlug(tx, normalizedPayload.slug),
          sku: await this.resolveUniqueProductSku(tx, normalizedPayload.sku),
          variants: await this.resolveVariantSkus(tx, normalizedPayload.variants),
        };
        const subCategory = await this.resolveSubCategory(
          tx,
          safePayload.categoryId,
          safePayload.subCategory,
        );
        const product = await tx.product.create({
          data: this.mapProductCreate(
            safePayload,
            uploadedImages,
            options.publishStatus ?? ProductStatus.DRAFT,
            pricingSettings,
            subCategory,
            importRecord.sourceUrl,
          ),
          select: { id: true },
        });

        return tx.sheinImport.update({
          where: { id: importId },
          data: {
            status:
              options.publishStatus === ProductStatus.ACTIVE
                ? SheinImportStatus.PUBLISHED
                : SheinImportStatus.PRODUCT_CREATED,
            createdProductId: product.id,
            importedImagesCount: uploadedImages.length,
            editedPayload: normalizedPayload as unknown as Prisma.InputJsonValue,
            publishedAt: options.publishStatus === ProductStatus.ACTIVE ? new Date() : null,
            completedAt: new Date(),
            errorCode: null,
            errorMessage: null,
            errors: Prisma.JsonNull,
          },
          include: this.include,
        });
      });
    } catch (error) {
      await this.cleanupUploadedImages(uploadedPublicIds);
      const friendlyMessage = this.friendlyPublishError(error);
      logStructured('error', 'shein_product_creation_failed', {
        importId,
        reason: this.errorMessage(error),
        friendlyMessage,
      });
      await this.prisma.sheinImport.update({
        where: { id: importId },
        data: {
          status: SheinImportStatus.FAILED,
          retryCount: { increment: 1 },
          errorCode: 'PRODUCT_CREATION_FAILED',
          errorMessage: friendlyMessage,
          errors: { message: friendlyMessage, reason: this.errorMessage(error) },
          completedAt: new Date(),
        },
      });
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new ServiceUnavailableException(friendlyMessage);
    }
  }

  private friendlyPublishError(error: unknown): string {
    const message = this.errorMessage(error);
    const exactReason = this.compactErrorMessage(message);
    if (/cloudinary|upload|fetch|network|timeout|econn|enotfound|certificate|tls/i.test(message)) {
      return 'Unable to upload product images now. Try again or add images manually.';
    }
    if (/too long|P2000|character varying|value too long/i.test(message)) {
      return 'Unable to create product: field value exceeds limit. Shorten title or option data.';
    }
    if (/unique|constraint|prisma|foreign key|database/i.test(message)) {
      return 'Unable to create product due to incomplete or duplicate data. Please review.';
    }
    if (/image/i.test(message)) {
      return 'Product images must be SHEIN source links or admin-uploaded images, max 20 images.';
    }
    return exactReason
      ? `Unable to create product from SHEIN data: ${exactReason}`
      : 'Unable to create product from SHEIN data. Please review and try again.';
  }

  private compactErrorMessage(message: string): string {
    return (
      message
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith('Invalid `')) ?? ''
    );
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;
      const message = record.message ?? record.error ?? record.error_description;
      if (typeof message === 'string' && message.trim()) return message.trim();
      try {
        return JSON.stringify(record);
      } catch {
        return '';
      }
    }
    return '';
  }

  private remoteImagePublicId(importId: string, imageUrl: string): string {
    const hash = createHash('sha1').update(`${importId}:${imageUrl}`).digest('hex').slice(0, 32);
    return `${SHEIN_IMAGE_FOLDER}/remote-${hash}`;
  }

  private validateProductImages(payload: SheinImportPreview): void {
    if (!payload.images.length) {
      throw new BadRequestException('Product images are required before creating product');
    }
    if (payload.images.length > SHEIN_MAX_PRODUCT_IMAGES) {
      throw new BadRequestException('Maximum 20 product images allowed');
    }
    for (const image of payload.images) {
      if (!image.cloudinaryPublicId && !isLikelyProductImage(image.url)) {
        throw new BadRequestException(
          'Product images must be SHEIN source links or admin-uploaded images',
        );
      }
    }
  }

  private validateProductRequiredFields(payload: SheinImportPreview): void {
    if (!payload.nameAr.trim()) {
      throw new BadRequestException('Product name is required before creating product');
    }
    if (
      !payload.priceAmount.trim() ||
      !Number.isFinite(Number(payload.priceAmount)) ||
      Number(payload.priceAmount) <= 0
    ) {
      throw new BadRequestException('Price is required before creating product');
    }
    if (payload.currency !== FIXED_SHEIN_CURRENCY) {
      throw new BadRequestException('SHEIN import currency must be SAR (Saudi Riyal)');
    }
    if (!payload.country?.trim()) {
      throw new BadRequestException('Country is required before creating product');
    }
    if (!payload.categoryId?.trim()) {
      throw new BadRequestException('Category is required before creating product');
    }
    assertValidSheinSubCategory(payload.categorySlug, payload.subCategory);
  }

  private async assertCategoryMatchesMainCategory(payload: SheinImportPreview): Promise<void> {
    if (!payload.categoryId) {
      throw new BadRequestException('Main category is required before creating product');
    }
    const category = await this.prisma.category.findFirst({
      where: { id: payload.categoryId, deletedAt: null, isActive: true },
      select: { slug: true },
    });
    if (!category) {
      throw new BadRequestException(
        'Product must be linked to an active main category from the database',
      );
    }

    const selectedMainCategory = normalizeSheinMainCategory(payload.categorySlug);
    if (selectedMainCategory && selectedMainCategory !== category.slug.toLowerCase()) {
      throw new BadRequestException('Selected category does not match the database category');
    }
  }

  private mapProductCreate(
    payload: SheinImportPreview,
    uploadedImages: UploadedSheinProductImage[],
    publishStatus: ProductStatus,
    pricingSettings: SheinPublishPricingSettings,
    subCategory: ResolvedSheinSubCategory,
    sourceSheinUrl: string,
  ): Prisma.ProductCreateInput {
    const hasOriginalPrice =
      payload.originalPriceAmount &&
      Number(payload.originalPriceAmount) > Number(payload.priceAmount);
    const shouldApplyProductDiscount = hasOriginalPrice && (payload.discount ?? 0) > 0;

    return {
      category: payload.categoryId ? { connect: { id: payload.categoryId } } : undefined,
      subCategoryRef: subCategory.id ? { connect: { id: subCategory.id } } : undefined,
      sku: payload.sku,
      slug: payload.slug,
      nameAr: payload.nameAr,
      nameEn: payload.nameEn,
      description: payload.description,
      sourceSheinUrl,
      subCategory: subCategory.name ?? payload.subCategory,
      priceAmount: moneyStringToMinorUnits(payload.storePriceAmount, 'priceAmount'),
      discountPercent: shouldApplyProductDiscount ? (payload.discount ?? 0) : 0,
      rating: payload.rating ?? 0,
      currency: pricingSettings.storeCurrency,
      status: publishStatus,
      variants: {
        create: payload.variants.map((variant, index) => ({
          sku: variant.sku,
          nameAr: variant.nameAr,
          nameEn: variant.nameEn,
          size: variant.size,
          color: variant.color,
          priceAmount: variant.priceAmount
            ? moneyStringToMinorUnits(
                this.calculateStorePriceAmount(variant.priceAmount, pricingSettings.exchangeRate),
                'variant priceAmount',
              )
            : undefined,
          stockQuantity: variant.stockQuantity ?? 0,
          status: ProductVariantStatus.ACTIVE,
          isActive: true,
          sortOrder: index,
        })),
      },
      images: {
        create: uploadedImages.map((image, index) => ({
          cloudinaryPublicId: image.cloudinaryPublicId,
          secureUrl: image.secureUrl,
          width: image.width,
          height: image.height,
          byteSize: image.byteSize,
          format: image.format,
          altTextAr: image.altTextAr,
          isPrimary: uploadedImages.some((item) => item.isPrimary)
            ? image.isPrimary === true
            : index === 0,
          sortOrder: index,
          source: image.source ?? ImageSource.SHEIN_IMPORT,
        })),
      },
    };
  }

  private async resolveSubCategory(
    tx: Prisma.TransactionClient,
    categoryId: string | undefined,
    subCategory: string | undefined,
  ): Promise<ResolvedSheinSubCategory> {
    const normalizedName = subCategory?.replace(/\s+/g, ' ').trim();
    if (!categoryId || !normalizedName) {
      return {};
    }

    const existing = await tx.category.findFirst({
      where: {
        parentId: categoryId,
        deletedAt: null,
        isActive: true,
        OR: [
          { nameAr: { equals: normalizedName, mode: 'insensitive' } },
          { nameEn: { equals: normalizedName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, nameAr: true },
    });
    if (existing) {
      return { id: existing.id, name: existing.nameAr };
    }

    const parent = await tx.category.findFirstOrThrow({
      where: { id: categoryId, deletedAt: null, isActive: true, parentId: null },
      select: { slug: true },
    });
    const baseSlug =
      `${parent.slug}-${this.toSlug(normalizedName) || Date.now().toString(36)}`.slice(0, 180);
    const slug = await this.resolveUniqueCategorySlug(tx, baseSlug);
    const created = await tx.category.create({
      data: {
        slug,
        nameAr: normalizedName,
        nameEn: normalizedName,
        parentId: categoryId,
        isActive: true,
        sortOrder: 1000,
      },
      select: { id: true, nameAr: true },
    });

    return { id: created.id, name: created.nameAr };
  }

  private async resolveUniqueCategorySlug(
    tx: Prisma.TransactionClient,
    baseSlug: string,
  ): Promise<string> {
    for (let index = 0; index < 50; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`.slice(0, 180);
      const existing = await tx.category.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }
    return `${baseSlug}-${Date.now()}`.slice(0, 180);
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private async publishExistingDraft(importId: string, productId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { status: ProductStatus.ACTIVE },
      });

      return tx.sheinImport.update({
        where: { id: importId },
        data: {
          status: SheinImportStatus.PUBLISHED,
          publishedAt: new Date(),
          completedAt: new Date(),
          errorCode: null,
          errorMessage: null,
          errors: Prisma.JsonNull,
        },
        include: this.include,
      });
    });
  }

  private async resolveUniqueProductSlug(
    tx: Prisma.TransactionClient,
    baseSlug: string,
  ): Promise<string> {
    for (let index = 0; index < 20; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      const existing = await tx.product.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) {
        return candidate;
      }
    }
    return `${baseSlug}-${Date.now()}`.slice(0, 220);
  }

  private async resolveUniqueProductSku(
    tx: Prisma.TransactionClient,
    sku: string | undefined,
  ): Promise<string | undefined> {
    if (!sku) {
      return undefined;
    }
    const existing = await tx.product.findUnique({ where: { sku }, select: { id: true } });
    return existing ? `${sku}-${Date.now()}`.slice(0, 80) : sku;
  }

  private async resolveVariantSkus(
    tx: Prisma.TransactionClient,
    variants: SheinImportPreview['variants'],
  ): Promise<SheinImportPreview['variants']> {
    const seen = new Set<string>();
    const result: SheinImportPreview['variants'] = [];
    for (const variant of variants) {
      if (!variant.sku || seen.has(variant.sku)) {
        result.push({ ...variant, sku: undefined });
        continue;
      }
      const existing = await tx.productVariant.findUnique({
        where: { sku: variant.sku },
        select: { id: true },
      });
      result.push({ ...variant, sku: existing ? undefined : variant.sku });
      seen.add(variant.sku);
    }
    return result;
  }

  private async getPublishPricingSettings(
    payloadExchangeRate?: string | number,
  ): Promise<SheinPublishPricingSettings> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['shein.import.sarExchangeRate', 'store.currency'] } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((row) => [row.key, row.value]));
    const configuredExchangeRate = Number(
      payloadExchangeRate ?? byKey.get('shein.import.sarExchangeRate') ?? 15,
    );
    const exchangeRate =
      Number.isFinite(configuredExchangeRate) && configuredExchangeRate > 0
        ? configuredExchangeRate
        : 15;
    const rawCurrency = String(byKey.get('store.currency') ?? 'EGP')
      .trim()
      .toUpperCase();
    const storeCurrency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : 'EGP';
    return { exchangeRate, storeCurrency };
  }

  private calculateStorePriceAmount(
    sarPriceAmount: string | number | undefined,
    exchangeRate: number,
  ): string {
    const price = Number(
      String(sarPriceAmount ?? '')
        .replace(/,/g, '')
        .trim(),
    );
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(exchangeRate) ||
      exchangeRate <= 0
    ) {
      throw new BadRequestException(
        'Unable to calculate store price from SHEIN price and exchange rate',
      );
    }
    const calculated = price * exchangeRate;
    return calculated.toFixed(2).replace(/\.00$/, '');
  }

  private async cleanupUploadedImages(publicIds: string[]): Promise<void> {
    await Promise.all(
      publicIds.map((publicId) => this.uploadsService.deleteImage(publicId).catch(() => undefined)),
    );
  }
}
