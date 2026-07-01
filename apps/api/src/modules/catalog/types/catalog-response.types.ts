export type CatalogPrice = {
  amount: string;
  currency: string;
};

export type CatalogSale = {
  flashSaleId: string;
  title: string;
  discountPercent: string;
  originalPrice: CatalogPrice;
  discountAmount: CatalogPrice;
};

export type CatalogImage = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type CatalogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
  image: string | null;
  parentCategorySlug?: string | null;
  parentCategoryName?: string | null;
  subCategories?: CatalogSubCategory[];
};

export type CatalogSubCategory = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  image: string | null;
};

export type FeaturedSubCategory = {
  id: string;
  nameAr: string;
  nameEn: string | null;
  slug: string;
  image: string | null;
  parentCategorySlug: string;
  parentCategoryName: string;
  productsCount: number;
};

export type CatalogVariant = {
  id: string;
  sku: string | null;
  name: string;
  price: CatalogPrice | null;
  originalPrice?: CatalogPrice | null;
  sale?: CatalogSale | null;
  sortOrder: number;
  size: string | null;
  color: string | null;
  stockQuantity: number;
  status: string;
};

export type CatalogProductCard = {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  description: string | null;
  sourceSheinUrl: string | null;
  price: CatalogPrice;
  originalPrice?: CatalogPrice | null;
  sale?: CatalogSale | null;
  category: Omit<CatalogCategory, 'productCount'> | null;
  subCategory: string | null;
  discount: number;
  rating: number;
  primaryImage: CatalogImage | null;
  imageCount: number;
  variantCount: number;
  createdAt: string;
  isInStock?: boolean;
};

export type CatalogProductDetail = CatalogProductCard & {
  images: CatalogImage[];
  variants: CatalogVariant[];
};

export type PaginatedCatalogProducts = {
  items: CatalogProductCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
