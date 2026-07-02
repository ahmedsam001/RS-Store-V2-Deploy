export type StoreMainCategorySlug = 'women' | 'kids';

export type StoreCategoryConfig = {
  id: StoreMainCategorySlug;
  name: 'Women' | 'Kids';
  slug: StoreMainCategorySlug;
  shortDescription: string;
  subCategories: string[];
};

const STATIC_SUBCATEGORIES_BY_CATEGORY: Record<StoreMainCategorySlug, string[]> = {
  women: [
    'Shoes',
    'Dresses',
    'T-Shirts',
    'Blouses',
    'Hoodies',
    'Jeans',
    'Pants',
    'Skirts',
    'Bags',
    'Accessories',
    'Sandals',
    'Sneakers',
    'Slippers',
  ],
  kids: [
    'Shoes',
    'Dresses',
    'T-Shirts',
    'Sets',
    'Pants',
    'Shorts',
    'Sandals',
    'Sneakers',
    'Accessories',
  ],
};

export const STORE_CATEGORIES: StoreCategoryConfig[] = [
  {
    id: 'women',
    name: 'Women',
    slug: 'women',
    shortDescription: 'Women fashion products imported for storefront publishing.',
    subCategories: STATIC_SUBCATEGORIES_BY_CATEGORY.women,
  },
  {
    id: 'kids',
    name: 'Kids',
    slug: 'kids',
    shortDescription: 'Kids fashion products imported for storefront publishing.',
    subCategories: STATIC_SUBCATEGORIES_BY_CATEGORY.kids,
  },
];

export const DEFAULT_STORE_CATEGORY = STORE_CATEGORIES[0];

export function findStoreCategory(slugOrName?: string | null): StoreCategoryConfig | undefined {
  if (!slugOrName) return undefined;
  const normalized = slugOrName.trim().toLowerCase();
  return STORE_CATEGORIES.find(
    (category) => category.slug === normalized || category.name.toLowerCase() === normalized,
  );
}

export function getSubCategories(mainCategorySlug?: string | null): string[] {
  return findStoreCategory(mainCategorySlug)?.subCategories ?? [];
}

export function hasStaticSubCategories(mainCategorySlug?: string | null): boolean {
  return getSubCategories(mainCategorySlug).length > 0;
}

export function isValidStoreSubCategory(
  mainCategorySlug: string | undefined,
  subCategory: string | undefined,
) {
  if (!mainCategorySlug || !subCategory) return false;
  return getSubCategories(mainCategorySlug).some(
    (item) => item.toLowerCase() === subCategory.trim().toLowerCase(),
  );
}
