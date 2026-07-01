import { CatalogPrice } from '@/shared/types/CatalogTypes';
import { categoryPath, productPath } from '@/shared/constants/routes';

export function formatPrice(price: CatalogPrice): string {
  const amount = Number(price.amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function getProductUrl(slug: string): string {
  return productPath(slug);
}

export function getCategoryUrl(slug: string): string {
  return categoryPath(slug);
}