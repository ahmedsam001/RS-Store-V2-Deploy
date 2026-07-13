import { buildResponsiveImageSources } from '@/features/catalog/components/responsive-image-sources';

export const PRODUCT_CARD_IMAGE_WIDTH = 600;
export const PRODUCT_CARD_IMAGE_HEIGHT = 750;
export const PRODUCT_CARD_IMAGE_WIDTHS = [280, 400, 520, 640] as const;
export const PRODUCT_CARD_IMAGE_SIZES =
  '(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw';

export function getProductCardImageSources(src: string) {
  return buildResponsiveImageSources(src, [...PRODUCT_CARD_IMAGE_WIDTHS], PRODUCT_CARD_IMAGE_WIDTH);
}
