import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { categoryPath } from '@/shared/constants/routes';
import type { CatalogSubCategory, FeaturedSubCategory } from '@/shared/types/CatalogTypes';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { localizeKnownLabel, localizeProductText, useI18n } from '@/shared/i18n';

type SubcategoryNavItem =
  | FeaturedSubCategory
  | (CatalogSubCategory & {
      parentCategorySlug?: string;
      image?: string | null;
      nameAr?: string;
      nameEn?: string | null;
      productsCount?: number;
    });

type SubcategoryCircleNavProps = {
  subcategories: SubcategoryNavItem[];
  activeSlug?: string;
  parentCategorySlug?: string;
};

export function SubcategoryCircleNav({
  activeSlug,
  parentCategorySlug,
  subcategories,
}: SubcategoryCircleNavProps) {
  const { language, t } = useI18n();
  const locale = language;
  const visibleSubcategories = subcategories.filter(
    (subcategory) => getProductCount(subcategory) > 0,
  );

  if (visibleSubcategories.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t('catalog.shopByCategory')} className="rs-subcategory-circle-nav">
      {visibleSubcategories.map((subcategory) => {
        const name = localizeKnownLabel(
          localizeProductText(getSubcategoryName(subcategory, locale), language),
          language,
        );
        const productCount = getProductCount(subcategory);
        const resolvedParentSlug =
          'parentCategorySlug' in subcategory && subcategory.parentCategorySlug
            ? subcategory.parentCategorySlug
            : parentCategorySlug;
        const isActive = activeSlug === subcategory.slug;

        return (
          <div key={subcategory.id} className="rs-subcategory-circle-item">
            <CatalogLink
              href={getSubcategoryHref(subcategory.slug, resolvedParentSlug)}
              className={
                isActive
                  ? 'rs-subcategory-circle-link rs-subcategory-circle-active'
                  : 'rs-subcategory-circle-link'
              }
              aria-current={isActive ? 'page' : undefined}
              aria-label={t('catalog.productsFound', { count: productCount }) + `: ${name}`}
            >
              <span className="rs-subcategory-circle-image" aria-hidden="true">
                <ImageWithFallback
                  src={subcategory.image}
                  alt=""
                  loading="lazy"
                  width={88}
                  height={88}
                  className="h-full w-full"
                  fallbackVariant="subcategory"
                />
              </span>
              <span className="rs-subcategory-circle-name" title={name}>
                {name}
              </span>
            </CatalogLink>
          </div>
        );
      })}
    </nav>
  );
}

function getSubcategoryName(subcategory: SubcategoryNavItem, locale: string): string {
  if ('nameAr' in subcategory && subcategory.nameAr) {
    return locale === 'ar' ? subcategory.nameAr : subcategory.nameEn || subcategory.nameAr;
  }

  return 'name' in subcategory ? subcategory.name : subcategory.nameAr;
}

function getProductCount(subcategory: SubcategoryNavItem): number {
  if ('productsCount' in subcategory && typeof subcategory.productsCount === 'number') {
    return subcategory.productsCount;
  }

  if ('productCount' in subcategory && typeof subcategory.productCount === 'number') {
    return subcategory.productCount;
  }

  return 0;
}

function getSubcategoryHref(slug: string, parentCategorySlug?: string): string {
  if (parentCategorySlug) {
    return `${categoryPath(parentCategorySlug)}?subCategorySlug=${encodeURIComponent(slug)}`;
  }

  return `${categoryPath(slug)}`;
}
