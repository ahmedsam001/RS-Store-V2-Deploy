import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CatalogProductSort, CatalogProductsQueryDto } from './dto/catalog-products-query.dto';

type SearchIdRow = { id: string };
type SearchCountRow = { count: bigint };

type ProductSearchResult = {
  ids: string[];
  total: number;
};

@Injectable()
export class CatalogSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchCategoryIds(search: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<SearchIdRow[]>`
      SELECT COALESCE(c.parent_id, c.id)::text AS id
      FROM categories c
      WHERE c.is_active = true
        AND c.deleted_at IS NULL
        AND rs_catalog_category_search_vector(c.name_ar, c.name_en, c.description, c.slug)
          @@ websearch_to_tsquery('simple', ${search})
      GROUP BY COALESCE(c.parent_id, c.id)
      ORDER BY MIN(c.sort_order) ASC, MIN(c.name_ar) ASC, COALESCE(c.parent_id, c.id) ASC
    `;

    return rows.map((row) => row.id);
  }

  async searchProductIds(query: CatalogProductsQueryDto): Promise<ProductSearchResult> {
    const search = query.search?.trim() ?? '';
    const conditions = this.buildProductConditions(query, search);
    const whereSql = Prisma.sql`${Prisma.join(conditions, ' AND ')}`;
    const skip = (query.page - 1) * query.limit;
    const orderBy = this.buildProductOrderBy(query.sort, search);
    const saleJoin = this.activeFlashSaleJoin();

    const [countRows, idRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<SearchCountRow[]>`
        SELECT COUNT(*)::bigint AS count
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories sc ON sc.id = p.sub_category_id
        ${saleJoin}
        WHERE ${whereSql}
      `,
      this.prisma.$queryRaw<SearchIdRow[]>`
        SELECT p.id::text AS id
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories sc ON sc.id = p.sub_category_id
        ${saleJoin}
        WHERE ${whereSql}
        ${orderBy}
        LIMIT ${query.limit}
        OFFSET ${skip}
      `,
    ]);

    return {
      ids: idRows.map((row) => row.id),
      total: Number(countRows[0]?.count ?? 0),
    };
  }

  private buildProductConditions(query: CatalogProductsQueryDto, search: string): Prisma.Sql[] {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`p.status = 'ACTIVE'::"ProductStatus"`,
      Prisma.sql`p.deleted_at IS NULL`,
      Prisma.sql`c.is_active = true`,
      Prisma.sql`c.deleted_at IS NULL`,
      Prisma.sql`(p.sub_category_id IS NULL OR (sc.is_active = true AND sc.deleted_at IS NULL))`,
    ];

    if (search) {
      conditions.push(Prisma.sql`(
        rs_catalog_product_search_vector(p.name_ar, p.name_en, p.description, p.sku)
          @@ websearch_to_tsquery('simple', ${search})
        OR rs_catalog_category_search_vector(c.name_ar, c.name_en, c.description, c.slug)
          @@ websearch_to_tsquery('simple', ${search})
        OR (
          sc.id IS NOT NULL
          AND rs_catalog_category_search_vector(sc.name_ar, sc.name_en, sc.description, sc.slug)
            @@ websearch_to_tsquery('simple', ${search})
        )
        OR EXISTS (
          SELECT 1
          FROM product_variants v
          WHERE v.product_id = p.id
            AND v.is_active = true
            AND v.status = 'ACTIVE'::"ProductVariantStatus"
            AND v.deleted_at IS NULL
            AND rs_catalog_variant_search_vector(v.name_ar, v.name_en, v.sku)
              @@ websearch_to_tsquery('simple', ${search})
        )
      )`);
    }

    if (query.categoryId) {
      conditions.push(Prisma.sql`p.category_id = ${query.categoryId}::uuid`);
    }

    if (query.categorySlug) {
      conditions.push(
        Prisma.sql`(c.slug = ${query.categorySlug} OR sc.slug = ${query.categorySlug})`,
      );
    }

    if (query.subCategorySlug) {
      conditions.push(Prisma.sql`sc.slug = ${query.subCategorySlug}`);
    }

    if (query.subCategory) {
      conditions.push(Prisma.sql`lower(trim(p.sub_category)) = lower(trim(${query.subCategory}))`);
    }

    if (query.minPrice !== undefined) {
      conditions.push(Prisma.sql`${this.effectivePriceAmount()} >= ${query.minPrice}`);
    }

    if (query.maxPrice !== undefined) {
      conditions.push(Prisma.sql`${this.effectivePriceAmount()} <= ${query.maxPrice}`);
    }

    return conditions;
  }

  private buildProductOrderBy(sort: CatalogProductSort | undefined, search: string): Prisma.Sql {
    const effectivePrice = this.effectivePriceAmount();
    const orderMap: Record<CatalogProductSort, Prisma.Sql> = {
      newest: Prisma.sql`ORDER BY p.created_at DESC, p.id ASC`,
      oldest: Prisma.sql`ORDER BY p.created_at ASC, p.id ASC`,
      price_asc: Prisma.sql`ORDER BY ${effectivePrice} ASC, p.created_at DESC, p.id ASC`,
      price_desc: Prisma.sql`ORDER BY ${effectivePrice} DESC, p.created_at DESC, p.id ASC`,
      name_asc: Prisma.sql`ORDER BY p.name_ar ASC, p.created_at DESC, p.id ASC`,
      name_desc: Prisma.sql`ORDER BY p.name_ar DESC, p.created_at DESC, p.id ASC`,
    };

    if (sort) {
      return orderMap[sort];
    }

    if (!search) {
      return orderMap.newest;
    }

    return Prisma.sql`
      ORDER BY ts_rank_cd(
        rs_catalog_product_search_vector(p.name_ar, p.name_en, p.description, p.sku) ||
        rs_catalog_category_search_vector(c.name_ar, c.name_en, c.description, c.slug) ||
        rs_catalog_category_search_vector(sc.name_ar, sc.name_en, sc.description, sc.slug),
        websearch_to_tsquery('simple', ${search})
      ) DESC, p.created_at DESC, p.id ASC
    `;
  }

  private activeFlashSaleJoin(): Prisma.Sql {
    return Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT fs.discount_percent
        FROM flash_sale_products fsp
        INNER JOIN flash_sales fs ON fs.id = fsp.flash_sale_id
        WHERE fsp.product_id = p.id
          AND fs.status = 'ACTIVE'::"FlashSaleStatus"
          AND fs.starts_at <= CURRENT_TIMESTAMP
          AND fs.ends_at > CURRENT_TIMESTAMP
        ORDER BY fs.discount_percent DESC, fs.created_at DESC
        LIMIT 1
      ) afs ON TRUE
    `;
  }

  private effectivePriceAmount(): Prisma.Sql {
    return Prisma.sql`(
      p.price_amount - FLOOR(
        (p.price_amount * COALESCE(afs.discount_percent, NULLIF(p.discount_percent, 0), 0)) / 100
      )::int
    )`;
  }
}
