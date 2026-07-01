import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogProductDetail } from '@/shared/types/CatalogTypes';
import { AddToCartPanel } from '@/features/cart/components/AddToCartPanel';
import { renderWithRouter } from '@/test/test-utils';

const hookState = vi.hoisted(() => ({
  value: {
    addToCart: vi.fn(),
    clearFeedback: vi.fn(),
    error: null as string | null,
    isAdding: false,
    success: null as string | null,
  },
}));

vi.mock('../hooks/use-add-to-cart-action', () => ({
  useAddToCartAction: () => hookState.value,
}));

function createDetailProduct(overrides: Partial<CatalogProductDetail> = {}): CatalogProductDetail {
  return {
    id: 'product-detail-1',
    slug: 'detail-product',
    sku: 'DETAIL-1',
    name: 'Detailed dress',
    description: 'Description',
    price: { amount: '450.00', currency: 'EGP' },
    originalPrice: null,
    sale: null,
    category: null,
    primaryImage: null,
    imageCount: 0,
    variantCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    availableColors: ['Red'],
    availableSizes: ['S'],
    images: [],
    variants: [
      {
        id: 'variant-1',
        sku: 'VAR-1',
        name: 'Small / Red',
        price: { amount: '455.00', currency: 'EGP' },
        originalPrice: null,
        sale: null,
        sortOrder: 1,
        size: 'S',
        color: 'Red',
        stockQuantity: 2,
        status: 'ACTIVE',
      },
    ],
    ...overrides,
  };
}

describe('AddToCartPanel', () => {
  beforeEach(() => {
    hookState.value.addToCart.mockReset();
    hookState.value = {
      addToCart: hookState.value.addToCart,
      clearFeedback: vi.fn(),
      error: null,
      isAdding: false,
      success: null,
    };
  });

  it('shows a validation message before API request when variant selection is missing', async () => {
    renderWithRouter(<AddToCartPanel product={createDetailProduct()} />);

    await userEvent.click(screen.getByRole('button', { name: /Add to Cart/ }));

    expect(hookState.value.addToCart).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Please select a size first');
  });

  it('does not allow adding products without a purchasable variant', async () => {
    renderWithRouter(<AddToCartPanel product={createDetailProduct({ variantCount: 0, availableColors: [], availableSizes: [], variants: [] })} />);

    expect(screen.getByRole('button', { name: /Unavailable/ })).toBeDisabled();
    expect(screen.getByRole('alert').textContent).toContain('not configured with purchasable stock');
    expect(hookState.value.addToCart).not.toHaveBeenCalled();
  });

  it('keeps selected variant and submits the selected variant id', async () => {
    renderWithRouter(<AddToCartPanel product={createDetailProduct()} />);

    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: 'Red' }));
    await userEvent.click(screen.getByRole('button', { name: /Add to Cart/ }));

    expect(hookState.value.addToCart).toHaveBeenCalledWith({
      productId: 'product-detail-1',
      productVariantId: 'variant-1',
      quantity: 1,
    });
  });

  it('shows remaining stock when requested quantity exceeds selected variant stock', async () => {
    renderWithRouter(<AddToCartPanel product={createDetailProduct()} />);

    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: 'Red' }));
    await userEvent.clear(screen.getByLabelText(/Quantity/));
    await userEvent.type(screen.getByLabelText(/Quantity/), '3');
    await userEvent.click(screen.getByRole('button', { name: /Add to Cart/ }));

    expect(hookState.value.addToCart).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Only 2 left for this option.');
  });

  it('disables add to cart only when the selected variant is out of stock', async () => {
    renderWithRouter(
      <AddToCartPanel
        product={createDetailProduct({
          variants: [
            {
              id: 'variant-1',
              sku: 'VAR-1',
              name: 'Small / Red',
              price: { amount: '455.00', currency: 'EGP' },
              originalPrice: null,
              sale: null,
              sortOrder: 1,
              size: 'S',
              color: 'Red',
              stockQuantity: 0,
              status: 'ACTIVE',
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole('button', { name: /Add to Cart/ })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: 'Red' }));

    expect(screen.getByRole('button', { name: /Out of Stock/ })).toBeDisabled();
    expect(screen.getByRole('alert').textContent).toContain('Only 0 left for this option.');
  });

  it('shows API errors returned by the shared add to cart hook', () => {
    hookState.value = {
      ...hookState.value,
      error: 'Requested quantity is not available right now',
    };

    renderWithRouter(<AddToCartPanel product={createDetailProduct()} />);

    expect(screen.getByRole('alert').textContent).toContain('Requested quantity is not available right now');
  });
});
