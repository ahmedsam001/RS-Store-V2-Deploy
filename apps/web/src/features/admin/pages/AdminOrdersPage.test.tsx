import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOrder, AdminReports } from '@/features/admin/api/admin-api';
import { translateAdminText } from '@/features/admin/i18n/admin-arabic';
import { renderWithRouter } from '@/test/test-utils';
import { AdminOrdersPage, OrderListCard } from './AdminOrdersPage';

const api = vi.hoisted(() => ({
  order: vi.fn(),
  ordersPage: vi.fn(),
  reports: vi.fn(),
  updateOrderItemStatus: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

vi.mock('@/features/admin/api/admin-api', () => ({ adminApi: api }));
vi.mock('@/features/auth', () => ({ useAuth: () => ({ csrfToken: 'csrf-token' }) }));

const order: AdminOrder = {
  id: 'order-1',
  orderNumber: 'RS-20260712-000003',
  status: 'CONFIRMED',
  paymentStatus: 'DEPOSIT_APPROVED',
  totalAmount: 95_200,
  depositAmount: 47_600,
  depositPaidAmount: 47_600,
  remainingAmount: 47_600,
  finalAmountDue: 47_600,
  finalPaidAmount: 0,
  currency: 'EGP',
  customerNameSnapshot: 'Mona Smith',
  customerPhoneSnapshot: '01012345678',
  shippingAddressSnapshot: 'Cairo',
  createdAt: '2026-07-12T18:32:00.000Z',
  items: [],
  timeline: [],
};

const reports = {
  orders: {
    readyForBatch: 4,
    inBatch: 3,
    waitingFinalPayment: 2,
    readyToDeliver: 1,
    completed: 8,
    cancelled: 1,
  },
} as AdminReports;

function response(items: AdminOrder[] = [order], page = 1, total = items.length) {
  return {
    items,
    meta: {
      page,
      limit: 20,
      total,
      totalPages: Math.max(1, Math.ceil(total / 20)),
      hasNextPage: page * 20 < total,
      hasPreviousPage: page > 1,
    },
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

async function expectResultCount(expected: string) {
  const label = await screen.findByText('Results');
  const region = label.closest('[aria-live="polite"]');

  expect(region).not.toBeNull();
  expect(region).toHaveTextContent(expected);
}

function renderPage(route = '/admin/orders') {
  return renderWithRouter(
    <>
      <AdminOrdersPage />
      <LocationProbe />
    </>,
    { route },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.ordersPage.mockResolvedValue(response());
  api.reports.mockResolvedValue(reports);
  api.order.mockResolvedValue(order);
});

describe('AdminOrdersPage', () => {
  it('restores supported URL filters and displays the server result count', async () => {
    api.ordersPage.mockResolvedValue(response([order], 3, 1_234));
    renderPage('/admin/orders?workflow=COMPLETED&search=RS-2026&page=3');

    await expectResultCount('1,234');
    expect(screen.getByRole('textbox', { name: 'Search orders' })).toHaveValue('RS-2026');
    expect(screen.getByRole('button', { name: /Completed/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(api.ordersPage).toHaveBeenCalledWith(
      '&page=3&workflow=COMPLETED&search=RS-2026',
    );
  });

  it('commits search state to the URL and resets pagination to page one', async () => {
    const user = userEvent.setup();
    renderPage('/admin/orders?workflow=COMPLETED&page=3');
    await expectResultCount('1');

    const search = screen.getByRole('textbox', { name: 'Search orders' });
    const callsBeforeTyping = api.ordersPage.mock.calls.length;
    await user.type(search, ' Mona ');
    expect(api.ordersPage).toHaveBeenCalledTimes(callsBeforeTyping);
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/admin/orders?workflow=COMPLETED&search=Mona',
      );
    });
    expect(api.ordersPage).toHaveBeenLastCalledWith(
      '&page=1&workflow=COMPLETED&search=Mona',
    );
  });

  it('changing workflow resets page and clear filters removes supported parameters', async () => {
    const user = userEvent.setup();
    renderPage('/admin/orders?workflow=COMPLETED&search=Mona&page=3');
    await expectResultCount('1');

    await user.click(screen.getByRole('button', { name: /In SHEIN Batch/ }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/admin/orders?workflow=IN_SHEIN_BATCH&search=Mona',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/orders'),
    );
    expect(screen.getByRole('textbox', { name: 'Search orders' })).toHaveValue('');
  });

  it('opens the summary without changing list state and restores focus after Escape', async () => {
    const user = userEvent.setup();
    renderPage('/admin/orders?workflow=IN_SHEIN_BATCH&search=Mona&page=2');
    await expectResultCount('1');

    const trigger = screen.getAllByRole('button', { name: 'Quick view' })[0];
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Order summary' });
    expect(within(dialog).getByText(`Order ${order.orderNumber}`)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/admin/orders?workflow=IN_SHEIN_BATCH&search=Mona&page=2',
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Order summary' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('offers clear filters in a filtered empty state', async () => {
    api.ordersPage.mockResolvedValue(response([], 1, 0));
    const user = userEvent.setup();
    renderPage('/admin/orders?search=missing');

    expect(await screen.findByText('No orders match the current filters')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' }).at(-1)!);
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/admin/orders'),
    );
  });

  it('shows a safe retry error without exposing technical details', async () => {
    api.ordersPage.mockRejectedValue(new Error('database stack secret'));
    renderPage();

    expect(await screen.findByText('Could not load orders')).toBeInTheDocument();
    expect(screen.queryByText(/database stack secret/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('OrderListCard', () => {
  it('uses the same essential presentation for desktop and mobile while protecting API data', () => {
    renderWithRouter(
      <OrderListCard language="en" onSelect={vi.fn()} order={order} selected={false} />,
    );

    expect(screen.getAllByText(order.orderNumber)).toHaveLength(2);
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toHaveTextContent(order.customerNameSnapshot!);
      expect(card).toHaveTextContent(order.customerPhoneSnapshot!);
    }
    expect(screen.getAllByText('Confirmed')).toHaveLength(2);
    expect(screen.getAllByText('Deposit Approved')).toHaveLength(2);
    expect(screen.getAllByText('Add to SHEIN Batch')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Quick view' })).toHaveLength(2);
    for (const value of screen.getAllByText(order.orderNumber)) {
      expect(value).toHaveAttribute('data-no-admin-translate');
    }
  });

  it('renders localized Arabic status and next-action labels without changing identifiers', () => {
    renderWithRouter(
      <OrderListCard language="ar" onSelect={vi.fn()} order={order} selected={false} />,
    );

    expect(screen.getAllByText('مؤكد')).toHaveLength(2);
    expect(screen.getAllByText('تم اعتماد العربون')).toHaveLength(2);
    expect(screen.getAllByText('إضافة إلى دفعة شي إن')).toHaveLength(2);
    expect(screen.getAllByText(order.orderNumber)).toHaveLength(2);
    expect(screen.getAllByText(order.customerPhoneSnapshot!)).toHaveLength(2);
  });
});

it('translates the separated Dashboard review-task phrase', () => {
  expect(translateAdminText('Tasks need review').trim()).toBe('مهام تحتاج مراجعة');
});
