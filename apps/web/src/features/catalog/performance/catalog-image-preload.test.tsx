import { beforeEach, describe, expect, it } from 'vitest';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import {
  getProductCardImageSources,
  PRODUCT_CARD_IMAGE_SIZES,
} from '@/features/catalog/components/product-card-image';
import {
  clearCatalogImagePreload,
  syncCatalogImagePreload,
} from '@/features/catalog/performance/catalog-image-preload';
import { createMockProduct, renderWithRouter } from '@/test/test-utils';

describe('catalog LCP image preload', () => {
  beforeEach(() => clearCatalogImagePreload());

  it('matches the rendered first product image candidates', () => {
    const product = createProductWithImage('first-product');
    const sources = getProductCardImageSources(product.primaryImage!.url);
    const link = syncCatalogImagePreload(product, '/catalog/products?page=1&limit=20');
    renderWithRouter(<ProductCard product={product} index={0} />);

    const image = document.querySelector<HTMLImageElement>('.rs-product-image');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', sources.src);
    expect(link).toHaveAttribute('imagesrcset', image?.getAttribute('srcset'));
    expect(link).toHaveAttribute('imagesizes', PRODUCT_CARD_IMAGE_SIZES);
    expect(link).toHaveAttribute('imagesizes', image?.getAttribute('sizes'));
    expect(link).toHaveAttribute('fetchpriority', 'high');
  });

  it('replaces the single hint when the first filtered product changes', () => {
    syncCatalogImagePreload(createProductWithImage('first-product'), 'first-query');
    syncCatalogImagePreload(createProductWithImage('filtered-product'), 'filtered-query');

    const links = document.head.querySelectorAll('link[data-rs-catalog-lcp-preload]');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('data-catalog-request-key', 'filtered-query');
  });

  it('removes the hint for an empty result or a product without an image', () => {
    syncCatalogImagePreload(createProductWithImage('first-product'), 'first-query');
    syncCatalogImagePreload(undefined, 'empty-query');

    expect(document.head.querySelector('link[data-rs-catalog-lcp-preload]')).toBeNull();
  });
});

function createProductWithImage(slug: string) {
  return createMockProduct({
    id: `${slug}-id`,
    slug,
    primaryImage: {
      id: `${slug}-image`,
      url: `https://res.cloudinary.com/demo/image/upload/${slug}.jpg`,
      width: 600,
      height: 750,
      altText: `${slug} image`,
      isPrimary: true,
      sortOrder: 0,
    },
  });
}
