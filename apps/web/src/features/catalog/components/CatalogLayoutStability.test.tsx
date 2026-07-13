import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductGrid } from '@/features/catalog/components/ProductGrid';
import { CatalogRouteSkeleton } from '@/features/catalog/components/skeletons/CatalogRouteSkeleton';
import { SearchResultSkeleton } from '@/features/catalog/components/skeletons/SearchResultSkeleton';
import { createMockProduct, renderWithRouter } from '@/test/test-utils';

describe('catalog layout stability', () => {
  it('reserves the default product page with the real responsive grid class', () => {
    const view = renderWithRouter(<SearchResultSkeleton />);
    const grid = view.container.querySelector('.rs-product-grid');

    expect(screen.getByRole('status')).toHaveTextContent('Loading catalog');
    expect(grid).not.toBeNull();
    expect(grid?.querySelectorAll('.rs-product-card')).toHaveLength(20);
    expect(grid?.querySelector('.rs-product-image-wrap')).not.toBeNull();
    expect(view.container.querySelector('.rs-catalog-pagination-slot')).not.toBeNull();
  });

  it('uses the same responsive grid container for loading and loaded products', () => {
    const loadingView = renderWithRouter(<SearchResultSkeleton count={2} />);
    expect(loadingView.container.querySelector('.rs-product-grid')).not.toBeNull();
    loadingView.unmount();

    const loadedView = renderWithRouter(
      <ProductGrid
        products={[
          createMockProduct({ id: 'product-1' }),
          createMockProduct({ id: 'product-2', slug: 'second-product' }),
        ]}
      />,
    );
    expect(loadedView.container.querySelector('.rs-product-grid')).not.toBeNull();
  });

  it('keeps the lazy storefront route from collapsing to a short spinner', () => {
    const view = renderWithRouter(<CatalogRouteSkeleton />);

    expect(view.container.querySelector('.rs-storefront-showcase-card')).not.toBeNull();
    expect(view.container.querySelector('.rs-catalog-filter-shell')).not.toBeNull();
    expect(view.container.querySelector('.rs-search-submit')).not.toBeNull();
    expect(view.container.querySelectorAll('.rs-subcategory-circle-item')).toHaveLength(4);
    expect(view.container.querySelectorAll('.rs-product-card')).toHaveLength(20);
    expect(view.container.querySelector('.rs-flash-compact')).toBeNull();
  });
});
