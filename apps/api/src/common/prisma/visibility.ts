import { Prisma, ProductStatus, ProductVariantStatus } from '@prisma/client';

export const notDeleted = { deletedAt: null } as const;

export function activeCategoryWhere(
  extra: Prisma.CategoryWhereInput = {},
): Prisma.CategoryWhereInput {
  return { isActive: true, deletedAt: null, AND: [extra] };
}

export function activeProductWhere(extra: Prisma.ProductWhereInput = {}): Prisma.ProductWhereInput {
  return {
    status: ProductStatus.ACTIVE,
    deletedAt: null,
    category: { isActive: true, deletedAt: null },
    AND: [extra],
  };
}

export function activeVariantWhere(
  extra: Prisma.ProductVariantWhereInput = {},
): Prisma.ProductVariantWhereInput {
  return { status: ProductVariantStatus.ACTIVE, isActive: true, deletedAt: null, AND: [extra] };
}
