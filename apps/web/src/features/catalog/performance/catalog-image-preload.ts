import { getProductCardImageSources, PRODUCT_CARD_IMAGE_SIZES } from '@/features/catalog/components/product-card-image';
import type { CatalogProductCard } from '@/shared/types/CatalogTypes';

const CATALOG_LCP_PRELOAD_SELECTOR = 'link[data-rs-catalog-lcp-preload]';

export function syncCatalogImagePreload(
  product: CatalogProductCard | undefined,
  requestKey: string,
): HTMLLinkElement | null {
  const existing = document.head.querySelector<HTMLLinkElement>(CATALOG_LCP_PRELOAD_SELECTOR);
  const imageUrl = product?.primaryImage?.url;

  if (!imageUrl) {
    existing?.remove();
    return null;
  }

  const sources = getProductCardImageSources(imageUrl);
  const link = existing ?? document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = sources.src;
  link.setAttribute('imagesrcset', sources.srcSet);
  link.setAttribute('imagesizes', PRODUCT_CARD_IMAGE_SIZES);
  link.setAttribute('fetchpriority', 'high');
  link.dataset.rsCatalogLcpPreload = '';
  link.dataset.catalogRequestKey = requestKey;

  if (!existing) {
    document.head.append(link);
  }

  return link;
}

export function clearCatalogImagePreload(requestKey?: string): void {
  const existing = document.head.querySelector<HTMLLinkElement>(CATALOG_LCP_PRELOAD_SELECTOR);
  if (!existing) return;
  if (requestKey && existing.dataset.catalogRequestKey !== requestKey) return;
  existing.remove();
}
