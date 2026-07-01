import { PATHS, categoryPath } from '@/shared/constants/routes';

export type StoreNavigationLink = {
  href: string;
  label: string;
  guestOnly?: boolean;
};

export const STORE_FALLBACK_CATEGORY_LINKS: StoreNavigationLink[] = [
  { href: categoryPath('women'), label: 'Women' },
  { href: categoryPath('kids'), label: 'Kids' },
];

export const STORE_CUSTOM_ORDER_LINK: StoreNavigationLink = {
  href: PATHS.customOrder,
  label: 'Custom Order',
};

export const STORE_PRIMARY_NAV_LINKS: StoreNavigationLink[] = [
  ...STORE_FALLBACK_CATEGORY_LINKS,
  STORE_CUSTOM_ORDER_LINK,
];

export const STORE_FOOTER_CATEGORY_LINKS: StoreNavigationLink[] = STORE_FALLBACK_CATEGORY_LINKS;

export const STORE_FOOTER_ACCOUNT_LINKS: StoreNavigationLink[] = [
  { href: PATHS.cart, label: 'Cart' },
  { href: PATHS.orders, label: 'Orders' },
  { href: PATHS.login, label: 'Login', guestOnly: true },
];
