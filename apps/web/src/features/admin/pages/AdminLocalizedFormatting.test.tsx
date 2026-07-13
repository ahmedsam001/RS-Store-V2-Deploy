import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdminOrder, AdminOverviewRecentOrder } from '@/features/admin/api/admin-api';
import { renderWithRouter } from '@/test/test-utils';
import dashboardSource from './AdminDashboardPage.tsx?raw';
import { RecentOrderRow } from './AdminDashboardPage';
import paymentsSource from './AdminPaymentsReviewPage.tsx?raw';
import { PaymentReviewListCard } from './AdminPaymentsReviewPage';

const orderNumber = 'RS-20260712-000003';
const customerName = 'Mona Smith';
const phone = '01012345678';
const createdAt = '2026-07-12T18:32:00.000Z';

const recentOrder: AdminOverviewRecentOrder = {
  id: 'order-1',
  orderNumber,
  status: 'PENDING',
  paymentStatus: 'DEPOSIT_SUBMITTED',
  totalAmount: 95_200,
  currency: 'EGP',
  customerNameSnapshot: customerName,
  customerPhoneSnapshot: phone,
  createdAt,
};

const paymentOrder: AdminOrder = {
  ...recentOrder,
  depositAmount: 47_600,
  depositPaidAmount: 47_600,
  remainingAmount: 47_600,
  finalAmountDue: 47_600,
  finalPaymentMethod: 'INSTAPAY',
};

function normalized(value: string | null): string {
  return (value ?? '')
    .replace(/[\u061c\u200e\u200f]/gu, '')
    .replace(/\u00a0/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

describe('Admin page localized formatting', () => {
  it('localizes Dashboard money and time without changing order data', () => {
    const english = renderWithRouter(
      <RecentOrderRow language="en" order={recentOrder} />,
    );

    expect(screen.getByText(orderNumber)).toBeInTheDocument();
    expect(screen.getByText((_, element) => normalized(element?.textContent ?? '') === 'EGP 952.00'))
      .toHaveAttribute('data-no-admin-translate');
    expect(screen.getByText(new RegExp(customerName))).toHaveTextContent(phone);

    english.unmount();
    renderWithRouter(<RecentOrderRow language="ar" order={recentOrder} />);
    const arabicMoney = screen.getByText((_, element) => {
      const text = normalized(element?.textContent ?? '');
      return (
        element?.tagName === 'P' &&
        element.getAttribute('dir') === 'auto' &&
        text.includes('952.00') &&
        /ج\.م/u.test(text)
      );
    });
    expect(arabicMoney).toHaveAttribute('data-no-admin-translate');
    expect(normalized(arabicMoney.textContent)).not.toMatch(/^EGP/u);
    expect(screen.getByText(orderNumber)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(customerName))).toHaveTextContent(phone);
  });

  it('localizes Payments Review fields while preserving identifiers and protected data', () => {
    const english = renderWithRouter(
      <PaymentReviewListCard
        language="en"
        onSelect={vi.fn()}
        order={paymentOrder}
        selected={false}
      />,
    );

    const totalField = screen.getByText('Total').parentElement;
    expect(totalField).not.toBeNull();
    expect(normalized(within(totalField!).getByRole('strong').textContent)).toBe('EGP 952.00');
    expect(screen.getByText(orderNumber)).toHaveAttribute('data-no-admin-translate');
    expect(screen.getByText(new RegExp(customerName)).parentElement).toHaveAttribute(
      'data-no-admin-translate',
    );
    expect(screen.getByText(phone)).toBeInTheDocument();

    english.unmount();
    renderWithRouter(
      <PaymentReviewListCard
        language="ar"
        onSelect={vi.fn()}
        order={paymentOrder}
        selected={false}
      />,
    );

    const localizedTotal = screen.getByText('Total').parentElement;
    const localizedTotalValue = normalized(
      within(localizedTotal!).getByRole('strong').textContent,
    );
    expect(localizedTotalValue).toContain('952.00');
    expect(localizedTotalValue).toMatch(/ج\.م/u);
    expect(localizedTotalValue).not.toMatch(/^EGP/u);
    expect(screen.getByText(orderNumber)).toBeInTheDocument();
    expect(screen.getByText(phone)).toBeInTheDocument();
  });

  it('wires both approved pages to the shared formatter and removes page-local locale calls', () => {
    expect(dashboardSource).toContain(
      "formatAdminCurrency(data.todayRevenueAmount, 'EGP', language)",
    );
    expect(dashboardSource).toContain('formatAdminDateTime(new Date(), language)');
    expect(paymentsSource).toContain(
      'formatAdminCurrency(order.totalAmount, order.currency, language)',
    );
    expect(paymentsSource).toContain('formatAdminDateTime(order.createdAt, language)');
    expect(`${dashboardSource}\n${paymentsSource}`).not.toMatch(
      /toLocaleString|Intl\.NumberFormat/u,
    );
  });
});
