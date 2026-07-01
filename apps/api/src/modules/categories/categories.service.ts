import { BadRequestException, Injectable } from '@nestjs/common';
import { buildPaginationMeta } from '../../common/pagination/paginated-response';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CategoriesQueryDto } from './dto/categories-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService, private readonly auditService: AuditService) {}

  async create(dto: CreateCategoryDto, actor?: AuthenticatedUser) {
    const category = await this.prisma.category.create({ data: dto });
    await this.auditService.log({ actorUserId: actor?.id, action: 'CATEGORY_CREATED', entityType: 'CATEGORY', entityId: category.id });
    return category;
  }

  async findAll(query: CategoriesQueryDto) {
    const where = {
      deletedAt: null,
      isActive: query.isActive,
      parentId: query.parentId ?? (query.includeChildren ? null : undefined),
      OR: query.search
        ? [
            { nameAr: { contains: query.search, mode: 'insensitive' as const } },
            { nameEn: { contains: query.search, mode: 'insensitive' as const } },
            { slug: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: query.includeChildren
          ? {
              children: {
                where: {
                  deletedAt: null,
                  isActive: query.isActive,
                  OR: query.search
                    ? [
                        { nameAr: { contains: query.search, mode: 'insensitive' as const } },
                        { nameEn: { contains: query.search, mode: 'insensitive' as const } },
                        { slug: { contains: query.search, mode: 'insensitive' as const } },
                      ]
                    : undefined,
                },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
              },
            }
          : undefined,
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query, total) };
  }

  findById(id: string) {
    return this.prisma.category.findFirstOrThrow({ where: { id, deletedAt: null } });
  }

  async createSubcategory(parentId: string, dto: CreateCategoryDto, actor?: AuthenticatedUser) {
    const category = await this.prisma.category.create({ data: { ...dto, parentId } });
    await this.auditService.log({ actorUserId: actor?.id, action: 'SUBCATEGORY_CREATED', entityType: 'CATEGORY', entityId: category.id });
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, actor?: AuthenticatedUser) {
    await this.prisma.category.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.auditService.log({ actorUserId: actor?.id, action: 'CATEGORY_UPDATED', entityType: 'CATEGORY', entityId: id, metadata: { isActive: dto.isActive ?? null } });
    return category;
  }

  async remove(id: string, actor?: AuthenticatedUser) {
    await this.prisma.category.findFirstOrThrow({ where: { id, deletedAt: null }, select: { id: true } });
    const linkedProducts = await this.prisma.product.count({
      where: {
        deletedAt: null,
        status: { not: 'ARCHIVED' },
        OR: [{ categoryId: id }, { subCategoryId: id }],
      },
    });
    if (linkedProducts > 0) {
      throw new BadRequestException('Move or archive products before deleting this category');
    }
    const linkedChildren = await this.prisma.category.count({ where: { parentId: id, deletedAt: null } });
    if (linkedChildren > 0) {
      throw new BadRequestException('Delete or move subcategories before deleting this category');
    }
    const category = await this.prisma.category.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.auditService.log({ actorUserId: actor?.id, action: 'CATEGORY_DELETED', entityType: 'CATEGORY', entityId: id });
    return category;
  }
}
