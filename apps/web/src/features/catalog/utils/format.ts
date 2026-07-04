import { CatalogPrice } from '@/shared/types/CatalogTypes';
import type { Language } from '@/shared/i18n';
import { categoryPath, productPath } from '@/shared/constants/routes';

export function formatPrice(price: CatalogPrice, language?: Language): string {
  const amount = Number(price.amount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const currency = price.currency || 'EGP';

  if (language && currency.toUpperCase() === 'EGP') {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2,
      minimumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2,
    }).format(safeAmount);

    return language === 'ar' ? `${formattedAmount} ج.م` : `EGP ${formattedAmount}`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function getProductUrl(slug: string): string {
  return productPath(slug);
}

export function getCategoryUrl(slug: string): string {
  return categoryPath(slug);
}
