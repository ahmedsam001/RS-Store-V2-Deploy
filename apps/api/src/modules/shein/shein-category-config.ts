import { BadRequestException } from '@nestjs/common';

export type SheinMainCategorySlug = string;

export const SHEIN_STORE_CATEGORIES: Record<string, readonly string[]> = {
  women: [
    'Shoes',
    'T-Shirts',
    'Dresses',
    'Blouses',
    'Hoodies',
    'Jeans',
    'Pants',
    'Skirts',
    'Bags',
    'Accessories',
    'Sandals',
    'Slippers',
    'Heels',
    'Sneakers',
    'Sleepwear',
  ],
  kids: [
    'Shoes',
    'T-Shirts',
    'Dresses',
    'Sets',
    'Hoodies',
    'Pants',
    'Shorts',
    'Sandals',
    'Sneakers',
    'Slippers',
    'Accessories',
    'Baby Clothing',
  ],
};

export function normalizeSheinMainCategory(value: unknown): SheinMainCategorySlug | undefined {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : undefined;
}

export function assertValidSheinSubCategory(mainCategory: unknown, subCategory: unknown): string {
  const normalizedMain = normalizeSheinMainCategory(mainCategory);
  const value = String(subCategory ?? '').replace(/\s+/g, ' ').trim();
  if (!normalizedMain || !value) {
    throw new BadRequestException('Main category and sub category are required before publishing');
  }

  const fixedAllowed = SHEIN_STORE_CATEGORIES[normalizedMain];
  if (!fixedAllowed) return value;

  const match = fixedAllowed.find((item) => item.toLowerCase() === value.toLowerCase());
  if (!match) {
    throw new BadRequestException('Selected sub category is not allowed for the selected main category');
  }
  return match;
}
