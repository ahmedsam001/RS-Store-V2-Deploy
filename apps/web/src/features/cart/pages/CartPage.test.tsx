import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter, createMockCart } from '@/test/test-utils';
import type { Cart } from '@/shared/types/CartTypes';
import { CartPage } from '@/features/cart/pages/CartPage';

const cartState = vi.hoisted(() => ({
  value: {
    cart: null as Cart | null,
    itemCount: 0,
    isLoading: false,
    error: null as string | null,
    refresh: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
  },
}));

vi.mock('@/features/cart/CartContext', () => ({
  useCart: () => cartState.value,
}));

const authState = vi.hoisted(() => ({
  value: {
    status: 'authenticated' as const,
    user: {
      id: '1',
      name: 'Test',
      phone: '+201000000000',
      role: 'CUSTOMER',
      email: 'test@test.com',
    },
    csrfToken: 'test-token',
    refresh: vi.fn(),
    customerLogin: vi.fn(),
    adminLogin: vi.fn(),
    logout: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('@/features/auth/AuthContext', async () => {
  const actual = await vi.importActual('@/features/auth/AuthContext');
  return {
    ...actual,
    useAuth: () => authState.value,
  };
});

describe('CartPage', () => {
  beforeEach(() => {
    cartState.value = {
      ...cartState.value,
      cart: null,
      itemCount: 0,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      clearCart: vi.fn(),
    };
  });

  it('shows a friendly empty cart state', () => {
    cartState.value.cart = createMockCart();

    renderWithRouter(<CartPage />);

    expect(screen.getByText('Your cart is empty')).toBeTruthy();
    expect(
      screen.getByText('Browse our collection and add your favorite products to get started'),
    ).toBeTruthy();
  });

  it('renders cart item product name price quantity and checkout action', () => {
    cartState.value.cart = createMockCart({
      items: [
        {
          id: 'cart-item-1',
          quantity: 2,
          product: {
            id: 'product-1',
            slug: 'cart-product',
            name: 'Elegant abaya',
            sku: 'CART-1',
            price: { amount: '250.00', currency: 'EGP' },
            originalPrice: null,
            sale: null,
            primaryImage: null,
          },
          variant: {
            id: 'variant-1',
            name: 'M / Black',
            sku: 'V-1',
            price: null,
            originalPrice: null,
            sale: null,
          },
          unitPrice: { amount: '250.00', currency: 'EGP' },
          originalUnitPrice: null,
          sale: null,
          lineTotal: { amount: '500.00', currency: 'EGP' },
        },
      ],
      summary: { itemCount: 2, subtotal: { amount: '500.00', currency: 'EGP' } },
    });

    renderWithRouter(<CartPage />);

    expect(screen.getByText('Elegant abaya')).toBeTruthy();
    expect(screen.getByText('M / Black')).toBeTruthy();
    expect(screen.getByText('Checkout')).toBeTruthy();
    expect(document.body.textContent).toContain('500.00');
  });
});
