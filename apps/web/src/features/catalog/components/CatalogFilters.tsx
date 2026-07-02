import { Search, SlidersHorizontal, X } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { CatalogProductsQuery } from '@/shared/types/CatalogTypes';

type CatalogFiltersProps = {
  query: CatalogProductsQuery;
  onSubmit: (query: CatalogProductsQuery) => void;
};

export function CatalogFilters({ onSubmit, query }: CatalogFiltersProps) {
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
      aria-label="Search and filter products"
      noValidate
    >
      <div className="rs-catalog-toolbar">
        <div className="rs-search-control">
          <Search className="rs-search-control-icon" aria-hidden="true" />
          <Input
            name="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search products"
            className="rs-search-input"
            dir="ltr"
            aria-label="Search products"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          className="rs-toolbar-action rs-search-submit"
          aria-label="Search"
        >
          Search
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
          Filters
          {activeFilterCount > 0 ? (
            <span className="rs-filter-count">{activeFilterCount}</span>
          ) : null}
        </Button>

        <label className="rs-sort-control">
          <span className="sr-only">Sort products by</span>
          <Select
            name="sort"
            value={sortValue ?? 'newest'}
            onChange={(event) =>
              handleSortChange(event.target.value as CatalogProductsQuery['sort'])
            }
            className="rs-sort-select"
            aria-label="Sort products by"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </Select>
        </label>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            aria-label="Clear filters"
            className="rs-toolbar-action rs-clear-filters"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className="rs-active-filter-row" aria-label="Active filters">
          {query.search ? (
            <span className="rs-active-filter-chip">Search: {query.search}</span>
          ) : null}
          {query.minPrice ? (
            <span className="rs-active-filter-chip">Min: {query.minPrice} EGP</span>
          ) : null}
          {query.maxPrice ? (
            <span className="rs-active-filter-chip">Max: {query.maxPrice} EGP</span>
          ) : null}
          {query.sort && query.sort !== 'newest' ? (
            <span className="rs-active-filter-chip">Sort: {formatSortLabel(query.sort)}</span>
          ) : null}
          {query.subCategorySlug ? (
            <span className="rs-active-filter-chip">Selected category</span>
          ) : null}
        </div>
      ) : null}

      {filtersOpen ? (
        <>
          <button
            type="button"
            className="rs-filter-backdrop"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          />
          <div
            id="catalog-advanced-filters"
            className="rs-filter-popover"
            role="region"
            aria-label="Advanced filters"
          >
            <div className="rs-filter-sheet-header">
              <div>
                <p className="rs-filter-sheet-kicker">Refine</p>
                <h3 className="rs-filter-sheet-title">Filter products</h3>
              </div>
              <button
                type="button"
                className="rs-filter-sheet-close"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="rs-filter-field">
              <span className="rs-filter-label">Min price</span>
              <Input
                name="minPrice"
                value={minPriceValue}
                onChange={(event) => setMinPriceValue(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                dir="ltr"
                className="rs-filter-input"
                aria-label="Minimum price in EGP"
              />
            </label>
            <label className="rs-filter-field">
              <span className="rs-filter-label">Max price</span>
              <Input
                name="maxPrice"
                value={maxPriceValue}
                onChange={(event) => setMaxPriceValue(event.target.value)}
                inputMode="decimal"
                placeholder="5000"
                dir="ltr"
                className="rs-filter-input"
                aria-label="Maximum price in EGP"
              />
            </label>
            <div className="rs-filter-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(false)}
              >
                Close
              </Button>
              <Button type="button" size="sm" onClick={handleApplyFilters}>
                Apply filters
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

function formatSortLabel(value: CatalogProductsQuery['sort']): string {
  switch (value) {
    case 'oldest':
      return 'Oldest';
    case 'price_asc':
      return 'Low to high';
    case 'price_desc':
      return 'High to low';
    case 'name_asc':
      return 'A-Z';
    case 'name_desc':
      return 'Z-A';
    case 'newest':
    default:
      return 'Newest';
  }
}
