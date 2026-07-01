import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { ProductPricingService } from '../pricing/product-pricing.service';
import { CatalogCategoriesQueryDto } from './dto/catalog-categories-query.dto';
import { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';
import { CatalogSearchService } from './catalog-search.service';
import {
  CatalogProductPayload,
  catalogProductInclude,
  mapCategory,
  mapProductCard,
  mapProductDetail,
  mapFeaturedSubCategory,
  CatalogPricingContext,
} from './mappers/catalog.mapper';
import { CatalogCategory, CatalogProductDetail, FeaturedSubCategory, PaginatedCatalogProducts } from './types/catalog-response.types';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogSearchService: CatalogSearchService,
    private readonly pricingService: ProductPricingService,
  ) {}

  async findCategories(query: CatalogCategoriesQueryDto): Promise<CatalogCategory[]> {
    const categoryIds = query.search ? await this.catalogSearchService.searchCategoryIds(query.search) : undefined;
    const topLevelCategoryWhere = { ...this.activeCategoryWhere(), parentId: null };
    const categories = await this.prisma.category.findMany({
      where: categoryIds ? { ...topLevelCategoryWhere, id: { in: categoryIds } } : topLevelCategoryWhere,
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });

    const productCounts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: this.activeProductWhere(),
      _count: { _all: true },
    });

    const subCategoryProductCounts = await this.getSubCategoryProductCounts();

    const countByCategoryId = new Map(
      productCounts
        .filter((count) => count.categoryId)
        .map((count) => [count.categoryId as string, count._count._all]),
    );

    return categories.map((category) =>
      mapCategory(category, countByCategoryId.get(category.id) ?? 0, subCategoryProductCounts.get(category.id) ?? []),
    );
  }

  private async getSubCategoryProductCounts(): Promise<Map<string, Array<{ id: string; slug: string; name: string; count: number; image: string | null }>>> {
    const childCategories = await this.prisma.category.findMany({
      where: {
        ...this.activeCategoryWhere(),
        parentId: { not: null },
      },
      include: {
        _count: {
          select: {
            subCategoryProducts: {
              where: this.activeProductWhere(),
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });

    const map = new Map<string, Array<{ id: string; slug: string; name: string; count: number; image: string | null }>>();
    childCategories.forEach((category) => {
      if (!category.parentId || category._count.subCategoryProducts <= 0) return;
      const existing = map.get(category.parentId) ?? [];
      existing.push({
        id: category.id,
        slug: category.slug,
        name: category.nameAr,
        count: category._count.subCategoryProducts,
        image: category.image ?? null,
      });
      map.set(category.parentId, existing);
    });

    return map;
  }

  async findCategoryBySlug(slug: string): Promise<CatalogCategory> {
    const category = await this.prisma.category.findFirst({
      where: { ...this.activeCategoryWhere(), slug },
      include: { parent: { select: { slug: true, nameAr: true } } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productWhere = category.parentId
      ? this.activeProductWhere({ subCategoryId: category.id })
      : this.activeProductWhere({ categoryId: category.id });
    const productCount = await this.prisma.product.count({ where: productWhere });
    const subCategoryProductCounts = category.parentId ? new Map() : await this.getSubCategoryProductCounts();
    return mapCategory(category, productCount, subCategoryProductCounts.get(category.id) ?? []);
  }

  async findFeaturedSubCategories(): Promise<FeaturedSubCategory[]> {
    const subCategories = await this.prisma.category.findMany({
      where: {
        ...this.activeCategoryWhere(),
        parentId: { not: null },
      },
      include: {
        parent: {
          select: { slug: true, nameAr: true },
        },
        _count: {
          select: {
            subCategoryProducts: {
              where: this.activeProductWhere(),
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
    });

    return subCategories
      .map((category) => mapFeaturedSubCategory(category as Category & { _count: { subCategoryProducts: number }; parent?: Category | null }))
      .filter((sub) => sub.productsCount > 0);
  }

  async findProducts(query: CatalogProductsQueryDto): Promise<PaginatedCatalogProducts> {
    return this.findProductsBySaleAwareIndex(query);
  }

  private async findProductsBySaleAwareIndex(query: CatalogProductsQueryDto): Promise<PaginatedCatalogProducts> {
    const searchResult = await this.catalogSearchService.searchProductIds(query);
    if (searchResult.ids.length === 0) {
      return this.paginateProducts([], searchResult.total, query);
    }

    const products = await this.prisma.product.findMany({
      where: this.activeProductWhere({ id: { in: searchResult.ids } }),
      include: catalogProductInclude,
    });

    const order = new Map(searchResult.ids.map((id, index) => [id, index]));
    const sortedProducts = products.sort((first, second) => (order.get(first.id) ?? 0) - (order.get(second.id) ?? 0));
    return this.paginateProducts(sortedProducts, searchResult.total, query);
  }

  private async paginateProducts(
    items: CatalogProductPayload[],
    total: number,
    query: CatalogProductsQueryDto,
  ): Promise<PaginatedCatalogProducts> {
    const totalPages = Math.max(1, Math.ceil(total / query.limit));

    const saleAdjustments = await this.pricingService.getActiveSaleAdjustments(items.map((item) => item.id));
    const context: CatalogPricingContext = { pricingService: this.pricingService, saleAdjustments };

    return {
      items: items.map((item) => mapProductCard(item, context)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async findProductBySlug(slug: string): Promise<CatalogProductDetail> {
    const product = await this.prisma.product.findFirst({
      where: this.activeProductWhere({ slug }),
      include: catalogProductInclude,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const saleAdjustments = await this.pricingService.getActiveSaleAdjustments([product.id]);
    const context: CatalogPricingContext = { pricingService: this.pricingService, saleAdjustments };
    return mapProductDetail(product, context);
  }

  private activeProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
    return {
      status: ProductStatus.ACTIVE,
      deletedAt: null,
      category: this.activeCategoryWhere(),
      AND: [extra],
    };
  }

  private activeCategoryWhere(): Prisma.CategoryWhereInput {
    return { isActive: true, deletedAt: null };
  }

}
