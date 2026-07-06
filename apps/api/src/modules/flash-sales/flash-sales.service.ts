import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlashSaleStatus, Prisma, ProductStatus } from '@prisma/client';
import { InMemoryTtlCacheService } from '../../common/cache/in-memory-ttl-cache.service';
import { PUBLIC_CACHE_PREFIXES } from '../../common/cache/public-cache-prefixes';
import { percentToBasisPoints } from '../../common/money/money';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  catalogProductInclude,
  mapProductCard,
  CatalogPricingContext,
} from '../catalog/mappers/catalog.mapper';
import { ProductPricingService } from '../pricing/product-pricing.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { FlashSaleProductDto } from './dto/flash-sale-product.dto';
import { FlashSalesQueryDto } from './dto/flash-sales-query.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';

type PublicFlashSalePayload = Prisma.FlashSaleGetPayload<{
  include: { products: { include: { product: { include: typeof catalogProductInclude } } } };
}>;

@Injectable()
export class FlashSalesService {
  private readonly publicFlashSalesCacheTtlMs = 30_000;

  private readonly publicInclude = {
    products: {
      where: { product: this.catalogVisibleProductWhere() },
      include: { product: { include: catalogProductInclude } },
    },
  } satisfies Prisma.FlashSaleInclude;

  private readonly adminInclude = {
    products: {
      include: {
        product: {
          include: { images: true, category: true, variants: { where: { deletedAt: null } } },
        },
      },
    },
  } satisfies Prisma.FlashSaleInclude;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pricingService: ProductPricingService,
    private readonly cache: InMemoryTtlCacheService,
  ) {}

  async findAllForAdmin(query: FlashSalesQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.FlashSaleWhereInput = {
      status: query.status,
      startsAt: query.startsFrom ? { gte: query.startsFrom } : undefined,
      endsAt: query.endsTo ? { lte: query.endsTo } : undefined,
      OR: search
        ? [
            { titleAr: { contains: search, mode: 'insensitive' } },
            { titleEn: { contains: search, mode: 'insensitive' } },
            {
              products: {
                some: { product: { nameAr: { contains: search, mode: 'insensitive' } } },
              },
            },
            {
              products: {
                some: { product: { nameEn: { contains: search, mode: 'insensitive' } } },
              },
            },
            { products: { some: { product: { sku: { contains: search, mode: 'insensitive' } } } } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.flashSale.findMany({
        where,
        include: this.adminInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.flashSale.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(query, total) };
  }

  async create(dto: CreateFlashSaleDto, actor?: AuthenticatedUser) {
    this.assertDiscountPercent(dto.discountPercent);
    this.assertSaleWindow(dto.startsAt, dto.endsAt);
    const productIds = [...new Set(dto.productIds ?? [])];
    const status = dto.status ?? FlashSaleStatus.SCHEDULED;
    await this.assertProductsCanJoinFlashSale(productIds);
    await this.assertProductsHaveNoOverlappingSale(productIds, dto.startsAt, dto.endsAt, status);

    const sale = await this.prisma.flashSale.create({
      data: {
        titleAr: dto.titleAr,
        titleEn: dto.titleEn,
        discountPercent: dto.discountPercent,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        status,
        products: { create: productIds.map((productId) => ({ productId })) },
      },
      include: this.adminInclude,
    });
    await this.auditService.log({
      actorUserId: actor?.id,
      action: 'FLASH_SALE_CREATED',
      entityType: 'FLASH_SALE',
      entityId: sale.id,
    });
    this.invalidatePublicStorefrontCaches();
    return sale;
  }

  async findAll(query: FlashSalesQueryDto) {
    return this.cache.getOrSet(
      this.cache.buildKey(`${PUBLIC_CACHE_PREFIXES.flashSales}list`, {
        limit: query.limit,
        page: query.page,
      }),
      this.publicFlashSalesCacheTtlMs,
      () => this.findAllPublicUncached(query),
    );
  }

  private async findAllPublicUncached(query: FlashSalesQueryDto) {
    const now = new Date();
    const sales = await this.prisma.flashSale.findMany({
      where: {
        status: FlashSaleStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
        products: { some: { product: this.catalogVisibleProductWhere() } },
      },
      include: this.publicInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return Promise.all(sales.map((sale) => this.mapPublicSale(sale)));
  }

  async findById(id: string) {
    const now = new Date();
    const flashSale = await this.prisma.flashSale.findFirst({
      where: {
        id,
        status: FlashSaleStatus.ACTIVE,
        startsAt: { lte: now },
        endsAt: { gt: now },
        products: { some: { product: this.catalogVisibleProductWhere() } },
      },
      include: this.publicInclude,
    });

    if (!flashSale) {
      throw new NotFoundException('Flash sale not found');
    }

    return this.mapPublicSale(flashSale);
  }

  async update(id: string, dto: UpdateFlashSaleDto, actor?: AuthenticatedUser) {
    const existing = await this.prisma.flashSale.findUnique({
      where: { id },
      include: { products: { select: { productId: true } } },
    });
    if (!existing) throw new NotFoundException('Flash sale not found');

    const startsAt = dto.startsAt ?? existing.startsAt;
    const endsAt = dto.endsAt ?? existing.endsAt;
    const status = dto.status ?? existing.status;
    this.assertDiscountPercent(dto.discountPercent ?? existing.discountPercent.toString());
    this.assertSaleWindow(startsAt, endsAt);
    await this.assertExistingProductsStillValid(id);
    await this.assertProductsHaveNoOverlappingSale(
      existing.products.map((product) => product.productId),
      startsAt,
      endsAt,
      status,
      id,
    );

    const sale = await this.prisma.flashSale.update({
      where: { id },
      data: dto,
      include: this.adminInclude,
    });
    await this.auditService.log({
      actorUserId: actor?.id,
      action: 'FLASH_SALE_UPDATED',
      entityType: 'FLASH_SALE',
      entityId: id,
      metadata: { status: dto.status ?? null },
    });
    this.invalidatePublicStorefrontCaches();
    return sale;
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    const sale = await this.prisma.flashSale.delete({ where: { id } });
    await this.auditService.log({
      actorUserId: actor?.id,
      action: 'FLASH_SALE_DELETED',
      entityType: 'FLASH_SALE',
      entityId: id,
    });
    this.invalidatePublicStorefrontCaches();
    return sale;
  }

  async addProduct(flashSaleId: string, dto: FlashSaleProductDto, actor?: AuthenticatedUser) {
    const sale = await this.prisma.flashSale.findUnique({ where: { id: flashSaleId } });
    if (!sale) throw new NotFoundException('Flash sale not found');

    await this.assertProductsCanJoinFlashSale([dto.productId]);
    await this.assertProductsHaveNoOverlappingSale(
      [dto.productId],
      sale.startsAt,
      sale.endsAt,
      sale.status,
      flashSaleId,
    );

    const existingRelation = await this.prisma.flashSaleProduct.findUnique({
      where: { flashSaleId_productId: { flashSaleId, productId: dto.productId } },
    });
    if (existingRelation) {
      throw new ConflictException('Product is already attached to this flash sale');
    }

    const relation = await this.prisma.flashSaleProduct.create({
      data: { flashSaleId, productId: dto.productId },
    });
    await this.auditService.log({
      actorUserId: actor?.id,
      action: 'FLASH_SALE_PRODUCT_ADDED',
      entityType: 'FLASH_SALE',
      entityId: flashSaleId,
      metadata: { productId: dto.productId },
    });
    this.invalidatePublicStorefrontCaches();
    return relation;
  }

  async removeProduct(flashSaleId: string, productId: string, actor?: AuthenticatedUser) {
    const relation = await this.prisma.flashSaleProduct.findUnique({
      where: { flashSaleId_productId: { flashSaleId, productId } },
    });
    if (!relation) throw new NotFoundException('Product is not attached to this flash sale');

    const deleted = await this.prisma.flashSaleProduct.delete({
      where: { flashSaleId_productId: { flashSaleId, productId } },
    });
    await this.auditService.log({
      actorUserId: actor?.id,
      action: 'FLASH_SALE_PRODUCT_REMOVED',
      entityType: 'FLASH_SALE',
      entityId: flashSaleId,
      metadata: { productId },
    });
    this.invalidatePublicStorefrontCaches();
    return deleted;
  }

  private invalidatePublicStorefrontCaches(): void {
    this.cache.deleteByPrefix(PUBLIC_CACHE_PREFIXES.flashSales);
    this.cache.deleteByPrefix(PUBLIC_CACHE_PREFIXES.catalog);
  }

  private async mapPublicSale(sale: PublicFlashSalePayload) {
    const products = sale.products.map((entry) => entry.product);
    const saleAdjustments = await this.pricingService.getActiveSaleAdjustments(
      products.map((product) => product.id),
    );
    const context: CatalogPricingContext = { pricingService: this.pricingService, saleAdjustments };

    return {
      id: sale.id,
      titleAr: sale.titleAr,
      titleEn: sale.titleEn,
      discountPercent: sale.discountPercent.toString(),
      startsAt: sale.startsAt.toISOString(),
      endsAt: sale.endsAt.toISOString(),
      status: sale.status,
      products: products.map((product) => mapProductCard(product, context)),
    };
  }

  private assertDiscountPercent(discountPercent: string): void {
    const basisPoints = percentToBasisPoints(discountPercent);
    if (basisPoints <= 0) {
      throw new BadRequestException('Flash sale discount percent must be greater than 0');
    }
    if (basisPoints > 10_000) {
      throw new BadRequestException('Flash sale discount percent must not exceed 100');
    }
  }

  private assertSaleWindow(startsAt: Date, endsAt: Date): void {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Flash sale dates are invalid');
    }

    if (endsAt <= startsAt) {
      throw new BadRequestException('Flash sale end date must be after the start date');
    }
  }

  private async assertProductsCanJoinFlashSale(productIds: string[]): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    const count = await this.prisma.product.count({
      where: { id: { in: productIds }, ...this.catalogVisibleProductWhere() },
    });
    if (count !== new Set(productIds).size) {
      throw new BadRequestException('Flash sales can include only active visible products');
    }
  }

  private async assertExistingProductsStillValid(flashSaleId: string): Promise<void> {
    const invalid = await this.prisma.flashSaleProduct.findFirst({
      where: { flashSaleId, NOT: { product: this.catalogVisibleProductWhere() } },
      select: { productId: true },
    });

    if (invalid) {
      throw new BadRequestException(
        'Flash sale contains a product that is no longer active or visible',
      );
    }
  }

  private async assertProductsHaveNoOverlappingSale(
    productIds: string[],
    startsAt: Date,
    endsAt: Date,
    status: FlashSaleStatus,
    excludeFlashSaleId?: string,
  ): Promise<void> {
    if (productIds.length === 0 || !this.requiresExclusiveSaleWindow(status)) {
      return;
    }

    const overlap = await this.prisma.flashSaleProduct.findFirst({
      where: {
        productId: { in: [...new Set(productIds)] },
        flashSaleId: excludeFlashSaleId ? { not: excludeFlashSaleId } : undefined,
        flashSale: {
          status: { in: [FlashSaleStatus.ACTIVE, FlashSaleStatus.SCHEDULED] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      },
      include: {
        product: { select: { nameAr: true, sku: true } },
        flashSale: { select: { id: true, titleAr: true, startsAt: true, endsAt: true } },
      },
    });

    if (overlap) {
      throw new ConflictException(
        `Product ${overlap.product.nameAr}${overlap.product.sku ? ` (${overlap.product.sku})` : ''} already has an overlapping flash sale: ${overlap.flashSale.titleAr}`,
      );
    }
  }

  private requiresExclusiveSaleWindow(status: FlashSaleStatus): boolean {
    return status === FlashSaleStatus.ACTIVE || status === FlashSaleStatus.SCHEDULED;
  }

  private catalogVisibleProductWhere(): Prisma.ProductWhereInput {
    return {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      category: { isActive: true, deletedAt: null },
    };
  }
}
