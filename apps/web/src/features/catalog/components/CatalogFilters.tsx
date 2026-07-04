import { Search, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { CatalogProductsQuery } from '@/shared/types/CatalogTypes';
import { useI18n } from '@/shared/i18n';

type CatalogFiltersProps = {
  query: CatalogProductsQuery;
  onSubmit: (query: CatalogProductsQuery) => void;
};

export function CatalogFilters({ onSubmit, query }: CatalogFiltersProps) {
  const { direction, t } = useI18n();
  const hasActiveAdvancedFilters = Boolean(
    query.minPrice || query.maxPrice || (query.sort && query.sort !== 'newest'),
  );
  const hasActiveFilters = Boolean(
    query.search || query.subCategorySlug || hasActiveAdvancedFilters,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(query.search ?? '');
  const [minPriceValue, setMinPriceValue] = useState(query.minPrice ?? '');
  const [maxPriceValue, setMaxPriceValue] = useState(query.maxPrice ?? '');
  const [sortValue, setSortValue] = useState<CatalogProductsQuery['sort']>(query.sort ?? 'newest');

  const activeFilterCount = useMemo(() => {
    return [
      query.search,
      query.minPrice,
      query.maxPrice,
      query.subCategorySlug,
      query.sort && query.sort !== 'newest',
    ].filter(Boolean).length;
  }, [query.maxPrice, query.minPrice, query.search, query.sort, query.subCategorySlug]);

  useEffect(() => {
    setSearchValue(query.search ?? '');
    setMinPriceValue(query.minPrice ?? '');
    setMaxPriceValue(query.maxPrice ?? '');
    setSortValue(query.sort ?? 'newest');
  }, [query.maxPrice, query.minPrice, query.search, query.sort]);

  function submitFilters(next?: Partial<CatalogProductsQuery>) {
    onSubmit({
      search: normalizedValue(searchValue),
      minPrice: normalizedValue(minPriceValue),
      maxPrice: normalizedValue(maxPriceValue),
      sort: sortValue === 'newest' ? undefined : sortValue,
      page: 1,
      limit: query.limit,
      categorySlug: query.categorySlug,
      subCategorySlug: query.subCategorySlug,
      ...next,
    });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitFilters();
  }

  function handleSortChange(value: CatalogProductsQuery['sort']) {
    setSortValue(value);
    submitFilters({ sort: value === 'newest' ? undefined : value });
  }

  function handleClearFilters() {
    setSearchValue('');
    setMinPriceValue('');
    setMaxPriceValue('');
    setSortValue('newest');
    setFiltersOpen(false);
    onSubmit({
      categorySlug: query.categorySlug,
      subCategorySlug: undefined,
      search: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: undefined,
      page: 1,
      limit: query.limit,
    });
  }

  function handleApplyFilters() {
    submitFilters();
    setFiltersOpen(false);
  }

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="rs-catalog-filter-shell"
      aria-label={t('filters.searchAndFilter')}
      noValidate
    >
      <div className="rs-catalog-toolbar">
        <div className="rs-search-control">
          <Search className="rs-search-control-icon" aria-hidden="true" />
          <Input
            name="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t('filters.searchProducts')}
            className="rs-search-input"
            dir={direction}
            aria-label={t('filters.searchProducts')}
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className="rs-toolbar-action rs-search-submit"
          aria-label={t('common.search')}
        >
          {t('common.search')}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((open) => !open)}
          className="rs-toolbar-action rs-filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="catalog-advanced-filters"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          {t('common.filters')}
          {activeFilterCount > 0 ? (
            <span className="rs-filter-count">{activeFilterCount}</span>
          ) : null}
        </Button>

        <label className="rs-sort-control">
          <span className="sr-only">{t('filters.sortProductsBy')}</span>
          <Select
            name="sort"
            value={sortValue ?? 'newest'}
            onChange={(event) =>
              handleSortChange(event.target.value as CatalogProductsQuery['sort'])
            }
            className="rs-sort-select"
            aria-label={t('filters.sortProductsBy')}
          >
            <option value="newest">{t('filters.newest')}</option>
            <option value="oldest">{t('filters.oldest')}</option>
            <option value="price_asc">{t('filters.priceLowHigh')}</option>
            <option value="price_desc">{t('filters.priceHighLow')}</option>
            <option value="name_asc">{t('filters.nameAZ')}</option>
            <option value="name_desc">{t('filters.nameZA')}</option>
          </Select>
        </label>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            aria-label={t('common.clear')}
            className="rs-toolbar-action rs-clear-filters"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {t('common.clear')}
          </Button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="rs-active-filter-row" aria-label={t('filters.activeFilters')}>
          {query.search ? (
            <span className="rs-active-filter-chip">{t('filters.searchChip', { value: query.search })}</span>
          ) : null}
          {query.minPrice ? (
            <span className="rs-active-filter-chip">{t('filters.minChip', { value: query.minPrice })}</span>
          ) : null}
          {query.maxPrice ? (
            <span className="rs-active-filter-chip">{t('filters.maxChip', { value: query.maxPrice })}</span>
          ) : null}
          {query.sort && query.sort !== 'newest' ? (
            <span className="rs-active-filter-chip">{t('filters.sortChip', { value: formatSortLabel(query.sort, t) })}</span>
          ) : null}
          {query.subCategorySlug ? (
            <span className="rs-active-filter-chip">{t('filters.selectedCategory')}</span>
          ) : null}
        </div>
      ) : null}

      {filtersOpen ? (
        <>
          <button
            type="button"
            className="rs-filter-backdrop"
            onClick={() => setFiltersOpen(false)}
            aria-label={t('filters.closeFilters')}
          />
          <div
            id="catalog-advanced-filters"
            className="rs-filter-popover"
            role="region"
            aria-label={t('filters.advancedFilters')}
          >
            <div className="rs-filter-sheet-header">
              <div>
                <p className="rs-filter-sheet-kicker">{t('filters.refine')}</p>
                <h3 className="rs-filter-sheet-title">{t('filters.filterProducts')}</h3>
              </div>
              <button
                type="button"
                className="rs-filter-sheet-close"
                onClick={() => setFiltersOpen(false)}
                aria-label={t('filters.closeFilters')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="rs-filter-field">
              <span className="rs-filter-label">{t('filters.minPrice')}</span>
              <Input
                name="minPrice"
                value={minPriceValue}
                onChange={(event) => setMinPriceValue(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                dir="ltr"
                className="rs-filter-input"
                aria-label={t('filters.minPriceAria')}
              />
            </label>
            <label className="rs-filter-field">
              <span className="rs-filter-label">{t('filters.maxPrice')}</span>
              <Input
                name="maxPrice"
                value={maxPriceValue}
                onChange={(event) => setMaxPriceValue(event.target.value)}
                inputMode="decimal"
                placeholder="5000"
                dir="ltr"
                className="rs-filter-input"
                aria-label={t('filters.maxPriceAria')}
              />
            </label>
            <div className="rs-filter-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(false)}
              >
                {t('common.close')}
              </Button>
              <Button type="button" size="sm" onClick={handleApplyFilters}>
                {t('filters.apply')}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </form>
  );
}

function normalizedValue(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined;
}

function formatSortLabel(value: CatalogProductsQuery['sort'], t: ReturnType<typeof useI18n>['t']): string {
  switch (value) {
    case 'oldest':
      return t('filters.oldest');
    case 'price_asc':
      return t('filters.priceLowHigh');
    case 'price_desc':
      return t('filters.priceHighLow');
    case 'name_asc':
      return t('filters.nameAZ');
    case 'name_desc':
      return t('filters.nameZA');
    case 'newest':
    default:
      return t('filters.newest');
  }
}
