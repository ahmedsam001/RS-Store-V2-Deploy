import { CatalogCategory } from '@/shared/types/CatalogTypes';
import { CatalogLink } from '@/features/catalog/components/CatalogLink';
import { ImageWithFallback } from '@/shared/components/ImageWithFallback';
import { getCategoryUrl } from '@/features/catalog/utils/format';
import { localizeKnownLabel, localizeProductText, useI18n } from '@/shared/i18n';

type CategoryCircleNavProps = {
  categories: CatalogCategory[];
  activeSlug?: string;
};

export function CategoryCircleNav({ activeSlug, categories }: CategoryCircleNavProps) {
  const { language, t } = useI18n();
  const visible = categories.length > 0 ? categories : [];

  return (
    <nav aria-label={t('catalog.shopByCategory')} className="rs-category-circle-nav">
      {visible.map((category) => (
        <div key={category.id} className="rs-category-circle-item">
          <CatalogLink
            href={getCategoryUrl(category.slug)}
            className={
              activeSlug === category.slug
                ? 'rs-category-circle-link rs-category-circle-active'
                : 'rs-category-circle-link'
            }
            aria-current={activeSlug === category.slug ? 'page' : undefined}
          >
            <span className="rs-category-circle-image" aria-hidden="true">
              <ImageWithFallback
                src={category.image}
                alt=""
                loading="lazy"
                className="h-full w-full"
                fallbackVariant="category"
              />
            </span>
            <span className="rs-category-circle-name">{localizeKnownLabel(localizeProductText(category.name, language), language)}</span>
          </CatalogLink>
        </div>
      ))}
    </nav>
  );
}
