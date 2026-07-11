import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/test-utils';
import { PATHS, orderPath } from '@/shared/constants/routes';
import { CustomOrderPage } from '@/features/custom-orders/pages/CustomOrderPage';

const navigate = vi.hoisted(() => vi.fn());
const refreshCart = vi.hoisted(() => vi.fn());
const customOrdersApiMock = vi.hoisted(() => ({
  listMine: vi.fn(),
  create: vi.fn(),
  adminList: vi.fn(),
  review: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/features/custom-orders/api/custom-orders-api', () => ({
  customOrdersApi: customOrdersApiMock,
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ csrfToken: 'csrf-token' }),
}));

vi.mock('@/features/cart', () => ({
  useCart: () => ({ refresh: refreshCart }),
}));

const acceptedOrder = {
  id: 'custom-order-1',
  userId: 'user-1',
  productUrl: 'https://example.com/product',
  requestedColor: 'Black',
  requestedSize: 'M',
  quantity: 1,
  customerNote: null,
  customerImageUrl: null,
  status: 'ACCEPTED' as const,
  adminTitle: 'Accepted custom dress',
  adminImageUrl: null,
  adminPriceAmount: '90000',
  adminShippingAmount: '10000',
  adminTotalAmount: '100000',
  adminNote: 'Ready for checkout',
  reviewedAt: '2026-07-11T00:00:00.000Z',
  convertedOrderId: null,
  convertedOrder: null,
  createdAt: '2026-07-10T00:00:00.000Z',
  updatedAt: '2026-07-11T00:00:00.000Z',
};

describe('CustomOrderPage accepted flow', () => {
  beforeEach(() => {
    navigate.mockReset();
    refreshCart.mockReset();
    refreshCart.mockResolvedValue(undefined);
    customOrdersApiMock.listMine.mockReset();
    customOrdersApiMock.listMine.mockResolvedValue([acceptedOrder]);
  });

  it('refreshes the cart and opens it instead of creating an order directly', async () => {
    renderWithRouter(<CustomOrderPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'View in Cart' }),
    );

    await waitFor(() => expect(refreshCart).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith(PATHS.cart);
  });

  it('opens an already converted order without refreshing the cart', async () => {
    customOrdersApiMock.listMine.mockResolvedValue([
      { ...acceptedOrder, convertedOrderId: 'order-1' },
    ]);

    renderWithRouter(<CustomOrderPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open Order' }));

    expect(navigate).toHaveBeenCalledWith(orderPath('order-1'));
    expect(refreshCart).not.toHaveBeenCalled();
  });
});
