import { translations, type Language, type TranslationKey } from '@/shared/i18n/translations';

const knownLabelKeys: Record<string, TranslationKey> = {
  women: 'category.women',
  woman: 'category.women',
  ladies: 'category.women',
  kids: 'category.kids',
  children: 'category.kids',
  bags: 'category.bags',
  bag: 'category.bags',
  shoes: 'category.shoes',
  shoe: 'category.shoes',
  accessories: 'category.accessories',
  accessory: 'category.accessories',
  cart: 'nav.cart',
  orders: 'nav.orders',
  login: 'nav.login',
  'custom order': 'nav.customOrder',
  'flash sale': 'nav.flashSale',
  'all products': 'nav.allProducts',
};

export function localizeKnownLabel(label: string | null | undefined, language: Language): string {
  if (!label) return '';
  if (language === 'en') return label;

  const normalized = label.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  const key = knownLabelKeys[normalized];
  return key ? translations.ar[key] : label;
}
