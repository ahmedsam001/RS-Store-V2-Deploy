import { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nProvider } from '@/shared/i18n';
import type { CatalogProductCard } from '@/shared/types/CatalogTypes';
import type { Cart } from '@/shared/types/CartTypes';

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) {
  window.localStorage.setItem('rs_language', 'en');

  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </I18nProvider>,
    options,
  );
}

export function createMockProduct(overrides: Partial<CatalogProductCard> = {}): CatalogProductCard {
  return {
    id: 'product-1',
    slug: 'premium-dress',
    sku: 'SKU-1',
    name: 'Premium Dress',
    description: 'Product description',
    price: { amount: '399.00', currency: 'EGP' },
    originalPrice: null,
    sale: null,
    category: { id: 'cat-1', slug: 'women', name: 'Women', description: null, image: null },
    primaryImage: null,
    imageCount: 0,
    variantCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockCart(overrides: Partial<Cart> = {}): Cart {
  return {
    id: 'cart-1',
    items: [],
    summary: { itemCount: 0, subtotal: { amount: '0.00', currency: 'EGP' } },
    ...overrides,
  };
}
