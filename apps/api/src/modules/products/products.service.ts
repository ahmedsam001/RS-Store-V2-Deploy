import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, ProductVariantStatus } from '@prisma/client';
import { moneyStringToMinorUnits } from '../../common/money/money';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuditService } from '../audit/audit.service';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto, UpdateProductVariantDto } from './dto/product-variant.dto';
import { ProductsQueryDto } from './dto/products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type ResolvedProductCategorySelection = {
  categoryId?: string;
  subCategoryId?: string;
  subCategoryName?: string;
};

@Injectable()
export class ProductsService {
  private readonly productInclude = {
    category: true,
    subCategoryRef: true,
    images: { orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }] },
    variants: { where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  } satisfies Prisma.ProductInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateProductDto, actor?: AuthenticatedUser) {
    const resolvedSlug = dto.slug ?? (await this.resolveUniqueSlug(dto.nameEn ?? dto.sku ?? dto.nameAr));
    const product = await this.prisma.$transaction(async (tx) => {
      const categorySelection = await this.resolveCategorySelection(tx, dto.categoryId, dto.subCategoryId, dto.subCategory);
      const created = await tx.product.create({
        data: this.mapProductCreate(dto, resolvedSlug, categorySelection),
      });

      if ((dto.stockQuantity !== undefined && dto.stockQuantity > 0) || dto.isInStock === true) {
        await tx.productVariant.create({
          data: {
            productId: created.id,
            nameAr: 'Default',
            stockQuantity: dto.stockQuantity && dto.stockQuantity > 0 ? dto.stockQuantity : 1,
            status: ProductVariantStatus.ACTIVE,
            isActive: true,
            sortOrder: 0,
          },
        });
      }

      await tx.auditLog.create({ data: { actorUserId: actor?.id, action: 'PRODUCT_CREATED', entityType: 'PRODUCT', entityId: created.id } });
      return tx.product.findUniqueOrThrow({ where: { id: created.id }, include: this.productInclude });
    });
    return product;
  }

  async findAll(query: ProductsQueryDto) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      categoryId: query.categoryId,
      status: query.status,
      priceAmount: {
        gte: query.minPrice,
        lte: query.maxPrice,
      },
      OR: query.search
        ? [
            { nameAr: { contains: query.search, mode: 'insensitive' } },
            { nameEn: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { category: { is: { nameAr: { contains: query.search, mode: 'insensitive' } } } },
            { category: { is: { nameEn: { contains: query.search, mode: 'insensitive' } } } },
            { subCategoryRef: { is: { nameAr: { contains: query.search, mode: 'insensitive' } } } },
            { subCategoryRef: { is: { nameEn: { contains: query.search, mode: 'insensitive' } } } },
            { subCategory: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    if (query.stockStatus === 'inStock') {
      where.isInStock = true;
    } else if (query.stockStatus === 'outOfStock') {
      where.isInStock = false;
    }

    const orderBy = this.buildOrderBy(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: this.productInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query, total) };
  }

  private buildOrderBy(query: ProductsQueryDto): Prisma.ProductOrderByWithRelationInput {
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    switch (sortBy) {
      case 'name':
        return { nameAr: sortOrder };
      case 'priceAmount':
        return { priceAmount: sortOrder };
      case 'status':
        return { status: sortOrder };
      default:
        return { createdAt: sortOrder };
    }
  }

  findById(id: string) {
    return this.prisma.product.findFirstOrThrow({ where: { id, deletedAt: null }, include: this.productInclude });
  }

  async update(id: string, dto: UpdateProductDto, actor?: AuthenticatedUser) {
    await this.assertProductExists(id);
    const product = await this.prisma.$transaction(async (tx) => {
      const categorySelection = await this.resolveCategorySelection(tx, dto.categoryId, dto.subCategoryId, dto.subCategory);
      const updated = await tx.product.update({
        where: { id },
        data: this.mapProductUpdate(dto, categorySelection),
      });

      await this.syncProductAvailability(tx, id, dto);

      await tx.auditLog.create({ data: { actorUserId: actor?.id, action: 'PRODUCT_UPDATED', entityType: 'PRODUCT', entityId: id, metadata: { status: dto.status ?? null } } });
      return tx.product.findUniqueOrThrow({ where: { id: updated.id }, include: this.productInclude });
    });
    return product;
  }


  async applyBulkDiscount(discount: number, actor?: AuthenticatedUser) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: { deletedAt: null },
        data: { discountPercent: discount },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: actor?.id,
          action: 'PRODUCT_BULK_DISCOUNT_UPDATED',
          entityType: 'PRODUCT',
          entityId: null,
          metadata: { discount, count: updated.count },
        },
      });

      return updated;
    });

    return { updatedCount: result.count, discount };
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    await this.assertProductExists(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
      include: this.productInclude,
    });
    await this.auditService.log({ actorUserId: actor?.id, action: 'PRODUCT_DELETED', entityType: 'PRODUCT', entityId: id });
    return product;
  }

  async changeStatus(id: string, status: ProductStatus, actor?: AuthenticatedUser) {
    await this.assertProductExists(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { status },
      include: this.productInclude,
    });
    await this.auditService.log({ actorUserId: actor?.id, action: 'PRODUCT_STATUS_CHANGED', entityType: 'PRODUCT', entityId: id, metadata: { status } });
    return product;
  }

  async addImage(productId: string, dto: AddProductImageDto, actor?: AuthenticatedUser) {
    await this.assertProductExists(productId);

    return this.prisma.$transaction(async (tx) => {
      const hasImages = await tx.productImage.count({ where: { productId } });
      const shouldBePrimary = dto.isPrimary === true || hasImages === 0;

      if (shouldBePrimary) {
        await tx.productImage.updateMany({ where: { productId, isPrimary: true }, data: { isPrimary: false } });
      }

      const image = await tx.productImage.create({ data: { ...dto, productId, isPrimary: shouldBePrimary } });
      await tx.auditLog.create({ data: { actorUserId: actor?.id, action: 'PRODUCT_IMAGE_ADDED', entityType: 'PRODUCT_IMAGE', entityId: image.id, metadata: { productId } } });
      return image;
    });
  }

  async removeImage(imageId: string, actor?: AuthenticatedUser) {
    const image = await this.prisma.productImage.findUniqueOrThrow({ where: { id: imageId } });

    const deleted = await this.prisma.$transaction(async (tx) => {
      const removed = await tx.productImage.delete({ where: { id: imageId } });
      if (removed.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: { productId: removed.productId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
        if (nextImage) {
          await tx.productImage.update({ where: { id: nextImage.id }, data: { isPrimary: true } });
        }
      }
      await tx.auditLog.create({ data: { actorUserId: actor?.id, action: 'PRODUCT_IMAGE_DELETED', entityType: 'PRODUCT_IMAGE', entityId: imageId, metadata: { productId: removed.productId } } });
      return removed;
    });

    await this.uploadsService.deleteImage(image.cloudinaryPublicId);
    return deleted;
  }

  async setPrimaryImage(productId: string, imageId: string, actor?: AuthenticatedUser) {
    await this.assertProductExists(productId);
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
      const updated = await tx.productImage.update({ where: { id: imageId }, data: { isPrimary: true } });
      await tx.auditLog.create({ data: { actorUserId: actor?.id, action: 'PRODUCT_IMAGE_PRIMARY_CHANGED', entityType: 'PRODUCT_IMAGE', entityId: imageId, metadata: { productId } } });
      return updated;
    });
  }

  async addVariant(productId: string, dto: CreateProductVariantDto, actor?: AuthenticatedUser) {
    await this.assertProductExists(productId);
    const variant = await this.prisma.productVariant.create({ data: { ...this.mapVariantCreate(dto), productId } });
    await this.auditService.log({ actorUserId: actor?.id, action: 'PRODUCT_VARIANT_CREATED', entityType: 'PRODUCT_VARIANT', entityId: variant.id, metadata: { productId } });
    return variant;
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateProductVariantDto, actor?: AuthenticatedUser) {
    await this.assertVariantExists(productId, variantId);
    const variant = await this.prisma.productVariant.update({ where: { id: variantId }, data: this.mapVariantUpdate(dto) });
    await this.auditService.log({ actorUserId: actor?.id, action: 'PRODUCT_VARIANT_UPDATED', entityType: 'PRODUCT_VARIANT', entityId: variantId, metadata: { productId } });
    return variant;
  }

  async removeVariant(productId: string, variantId: string, actor?: AuthenticatedUser) {
    await this.assertVariantExists(productId, variantId);
    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), isActive: false, status: ProductVariantStatus.INACTIVE },
    });
    await this.auditService.log({ actorUserId: actor?.id, action: 'PRODUCT_VARIANT_DELETED', entityType: 'PRODUCT_VARIANT', entityId: variantId, metadata: { productId } });
    return variant;
  }


  private async syncProductAvailability(
    tx: Prisma.TransactionClient,
    productId: string,
    dto: Pick<UpdateProductDto, 'isInStock' | 'stockQuantity'>,
  ): Promise<void> {
    const shouldSync = dto.isInStock !== undefined || dto.stockQuantity !== undefined;
    if (!shouldSync) {
      return;
    }

    const currentVariants = await tx.productVariant.findMany({
      where: { productId, deletedAt: null },
      select: { id: true, stockQuantity: true, reservedQuantity: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (dto.isInStock === false) {
      await tx.productVariant.updateMany({
        where: { productId, deletedAt: null },
        data: { stockQuantity: 0, reservedQuantity: 0, status: ProductVariantStatus.OUT_OF_STOCK, isActive: false },
      });
      return;
    }

    const requestedStock = dto.stockQuantity;
    if (requestedStock !== undefined) {
      if (currentVariants.length === 0 && requestedStock > 0) {
        await tx.productVariant.create({
          data: {
            productId,
            nameAr: 'Default',
            stockQuantity: requestedStock,
            status: ProductVariantStatus.ACTIVE,
            isActive: true,
            sortOrder: 0,
          },
        });
        return;
      }

      if (currentVariants.length > 0) {
        await tx.productVariant.updateMany({
          where: { productId, deletedAt: null },
          data: {
            stockQuantity: requestedStock,
            reservedQuantity: 0,
            status: requestedStock > 0 ? ProductVariantStatus.ACTIVE : ProductVariantStatus.OUT_OF_STOCK,
            isActive: requestedStock > 0,
          },
        });
        return;
      }
    }

    if (dto.isInStock === true && currentVariants.length === 0) {
      await tx.productVariant.create({
        data: {
          productId,
          nameAr: 'Default',
          stockQuantity: 1,
          status: ProductVariantStatus.ACTIVE,
          isActive: true,
          sortOrder: 0,
        },
      });
      return;
    }

    if (dto.isInStock === true && currentVariants.length > 0) {
      const hasAvailableVariant = currentVariants.some((variant) => variant.stockQuantity - variant.reservedQuantity > 0);
      if (!hasAvailableVariant) {
        await tx.productVariant.updateMany({
          where: { productId, deletedAt: null },
          data: { stockQuantity: 1, reservedQuantity: 0, status: ProductVariantStatus.ACTIVE, isActive: true },
        });
      } else {
        await tx.productVariant.updateMany({
          where: { productId, deletedAt: null, stockQuantity: { gt: 0 } },
          data: { status: ProductVariantStatus.ACTIVE, isActive: true },
        });
      }
    }
  }

  private mapProductCreate(
    dto: CreateProductDto,
    resolvedSlug: string,
    categorySelection: ResolvedProductCategorySelection,
  ): Prisma.ProductCreateInput {
    return {
      category: categorySelection.categoryId ? { connect: { id: categorySelection.categoryId } } : undefined,
      subCategoryRef: categorySelection.subCategoryId ? { connect: { id: categorySelection.subCategoryId } } : undefined,
      sku: dto.sku,
      slug: resolvedSlug,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      description: dto.description,
      sourceSheinUrl: dto.sourceSheinUrl?.trim() || null,
      subCategory: categorySelection.subCategoryName ?? dto.subCategory,
      priceAmount: moneyStringToMinorUnits(dto.priceAmount, 'priceAmount'),
      discountPercent: dto.discount ?? 0,
      rating: dto.rating,
      currency: dto.currency,
      status: dto.status,
      isInStock: dto.isInStock,
    };
  }

  private mapProductUpdate(
    dto: UpdateProductDto,
    categorySelection: ResolvedProductCategorySelection,
  ): Prisma.ProductUpdateInput {
    return {
      category: categorySelection.categoryId ? { connect: { id: categorySelection.categoryId } } : undefined,
      subCategoryRef: categorySelection.subCategoryId ? { connect: { id: categorySelection.subCategoryId } } : undefined,
      sku: dto.sku,
      slug: dto.slug,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      description: dto.description,
      sourceSheinUrl: dto.sourceSheinUrl === undefined ? undefined : dto.sourceSheinUrl.trim() || null,
      subCategory: categorySelection.subCategoryName ?? dto.subCategory,
      priceAmount: dto.priceAmount === undefined ? undefined : moneyStringToMinorUnits(dto.priceAmount, 'priceAmount'),
      discountPercent: dto.discount,
      rating: dto.rating,
      currency: dto.currency,
      status: dto.status,
      isInStock: dto.isInStock,
    };
  }

  private mapVariantCreate(dto: CreateProductVariantDto): Prisma.ProductVariantCreateWithoutProductInput {
    return {
      sku: dto.sku,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      size: dto.size,
      color: dto.color,
      priceAmount: dto.priceAmount === undefined ? undefined : moneyStringToMinorUnits(dto.priceAmount, 'variant priceAmount'),
      stockQuantity: dto.stockQuantity ?? 0,
      status: dto.status ?? ProductVariantStatus.ACTIVE,
      isActive: (dto.status ?? ProductVariantStatus.ACTIVE) === ProductVariantStatus.ACTIVE,
      sortOrder: dto.sortOrder,
    };
  }

  private mapVariantUpdate(dto: UpdateProductVariantDto): Prisma.ProductVariantUpdateInput {
    const status = dto.status;
    return {
      sku: dto.sku,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      size: dto.size,
      color: dto.color,
      priceAmount: dto.priceAmount === undefined ? undefined : moneyStringToMinorUnits(dto.priceAmount, 'variant priceAmount'),
      stockQuantity: dto.stockQuantity,
      status,
      isActive: status === undefined ? undefined : status === ProductVariantStatus.ACTIVE,
      sortOrder: dto.sortOrder,
    };
  }

  private async resolveCategorySelection(
    tx: Prisma.TransactionClient,
    categoryId?: string,
    subCategoryId?: string,
    subCategory?: string,
  ): Promise<ResolvedProductCategorySelection> {
    if (!categoryId && !subCategoryId && !subCategory?.trim()) {
      return {};
    }

    let resolvedCategoryId = categoryId;
    let resolvedSubCategoryId = subCategoryId;
    let resolvedSubCategoryName = subCategory?.trim() || undefined;

    if (resolvedCategoryId) {
      const parent = await tx.category.findFirst({
        where: { id: resolvedCategoryId, deletedAt: null, isActive: true, parentId: null },
        select: { id: true, slug: true },
      });
      if (!parent) {
        throw new BadRequestException('Product category must be an active main category');
      }
    }

    if (resolvedSubCategoryId) {
      const child = await tx.category.findFirst({
        where: { id: resolvedSubCategoryId, deletedAt: null, isActive: true, parentId: resolvedCategoryId ?? undefined },
        select: { id: true, nameAr: true, parentId: true },
      });
      if (!child?.parentId) {
        throw new BadRequestException('Product subcategory must be an active child category');
      }
      resolvedCategoryId = resolvedCategoryId ?? child.parentId;
      resolvedSubCategoryId = child.id;
      resolvedSubCategoryName = child.nameAr;
    }

    if (!resolvedSubCategoryId && resolvedCategoryId && resolvedSubCategoryName) {
      const child = await this.findOrCreateSubCategory(tx, resolvedCategoryId, resolvedSubCategoryName);
      resolvedSubCategoryId = child.id;
      resolvedSubCategoryName = child.nameAr;
    }

    return {
      categoryId: resolvedCategoryId,
      subCategoryId: resolvedSubCategoryId,
      subCategoryName: resolvedSubCategoryName,
    };
  }

  private async findOrCreateSubCategory(
    tx: Prisma.TransactionClient,
    parentId: string,
    name: string,
  ): Promise<{ id: string; nameAr: string }> {
    const normalizedName = name.replace(/\s+/g, ' ').trim();
    const existing = await tx.category.findFirst({
      where: {
        parentId,
        deletedAt: null,
        OR: [
          { nameAr: { equals: normalizedName, mode: 'insensitive' } },
          { nameEn: { equals: normalizedName, mode: 'insensitive' } },
          { slug: this.toSubCategorySlug(normalizedName) },
        ],
      },
      select: { id: true, nameAr: true },
    });
    if (existing) {
      return existing;
    }

    const parent = await tx.category.findFirstOrThrow({
      where: { id: parentId, deletedAt: null, isActive: true, parentId: null },
      select: { slug: true },
    });
    const baseSlug = `${parent.slug}-${this.toSubCategorySlug(normalizedName) || Date.now().toString(36)}`.slice(0, 180);
    const slug = await this.resolveUniqueCategorySlug(tx, baseSlug);

    return tx.category.create({
      data: {
        slug,
        nameAr: normalizedName,
        nameEn: normalizedName,
        parentId,
        isActive: true,
        sortOrder: 1000,
      },
      select: { id: true, nameAr: true },
    });
  }

  private async resolveUniqueCategorySlug(tx: Prisma.TransactionClient, baseSlug: string): Promise<string> {
    const safeBase = baseSlug || `subcategory-${Date.now()}`;
    for (let index = 0; index < 50; index += 1) {
      const candidate = index === 0 ? safeBase : `${safeBase}-${index + 1}`.slice(0, 180);
      const existing = await tx.category.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!existing) {
        return candidate;
      }
    }
    return `${safeBase}-${Date.now()}`.slice(0, 180);
  }

  private toSubCategorySlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private async resolveUniqueSlug(seed: string): Promise<string> {
    const baseSlug = this.toSlug(seed) || `product-${Date.now()}`;
    for (let index = 0; index < 50; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      const existing = await this.prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!existing) {
        return candidate;
      }
    }
    return `${baseSlug}-${Date.now()}`.slice(0, 220);
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 220);
  }

  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private async assertVariantExists(productId: string, variantId: string): Promise<void> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
  }
}
