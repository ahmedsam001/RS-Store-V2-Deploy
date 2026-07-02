import { CatalogCategory } from '@/shared/types/CatalogTypes';
import { getCategoryUrl } from '@/features/catalog/utils/format';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';

type CategoryNavProps = {
  categories: CatalogCategory[];
  activeSlug?: string;
};

export function CategoryNav({ activeSlug, categories }: CategoryNavProps) {
  const visibleCategories = categories
    .map((category) => ({
      ...category,
      subCategories: category.subCategories?.filter((sub) => sub.productCount > 0),
    }))
    .filter((category) => category.productCount > 0 || Boolean(category.subCategories?.length));

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Categories"
      className="premium-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
    >
      {visibleCategories.map((category) => (
        <div key={category.id} className="rs-category-nav-item">
          <CatalogLink
            href={getCategoryUrl(category.slug)}
            className={
              activeSlug === category.slug
                ? 'rs-nav-chip-active rs-chip shrink-0'
                : 'rs-chip shrink-0'
            }
            aria-current={activeSlug === category.slug ? 'page' : undefined}
          >
            <span className="rs-category-tile-image" aria-hidden="true">
              <ImageWithFallback
                src={category.image}
                alt=""
                loading="lazy"
                className="h-full w-full rounded-full"
                fallbackVariant="category"
              />
            </span>
            <span className="rs-category-tile-label">{category.name}</span>
          </CatalogLink>
          {category.subCategories && category.subCategories.length > 0 ? (
            <div className="rs-subcategory-list">
              {category.subCategories.map((sub) => (
                <CatalogLink
                  key={sub.id}
                  href={`${getCategoryUrl(category.slug)}?subCategorySlug=${encodeURIComponent(sub.slug)}`}
                  className="rs-subcategory-chip"
                >
                  {sub.name}
                </CatalogLink>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );
}
