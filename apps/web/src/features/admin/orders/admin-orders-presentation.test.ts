import { describe, expect, it } from 'vitest';
import type { AdminOrder } from '@/features/admin/api/admin-api';
import {
  DEFAULT_ORDER_WORKFLOW,
  buildOrderQuery,
  buildOrderUrlSearchParams,
  getAdminOrderNextAction,
  getAdminOrderStatusPresentation,
  getAdminPaymentStatusPresentation,
  getOrderFiltersFromSearchParams,
  hasActiveOrderFilters,
} from './admin-orders-presentation';

function order(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 'order-1',
    orderNumber: 'RS-20260712-000003',
    status: 'CONFIRMED',
    paymentStatus: 'DEPOSIT_APPROVED',
    totalAmount: 95_200,
    currency: 'EGP',
    customerNameSnapshot: 'Mona Smith',
    customerPhoneSnapshot: '01012345678',
    createdAt: '2026-07-12T18:32:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('Admin Orders presentation', () => {
  it('maps every order status independently in English and Arabic', () => {
    const statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
    for (const status of statuses) {
      expect(getAdminOrderStatusPresentation(status, 'en').label).not.toBe(status);
      expect(getAdminOrderStatusPresentation(status, 'ar').label).toMatch(/[\u0600-\u06ff]/u);
    }
    expect(getAdminOrderStatusPresentation('NEW_FUTURE_STATUS', 'en')).toEqual({
      label: 'Unknown order status',
      tone: 'neutral',
    });
  });

  it('maps every payment status without confusing it with order status', () => {
    const statuses = [
      'DEPOSIT_PENDING',
      'DEPOSIT_SUBMITTED',
      'DEPOSIT_REJECTED',
      'DEPOSIT_APPROVED',
      'FINAL_PAYMENT_PENDING',
      'FINAL_PAYMENT_SUBMITTED',
      'FINAL_PAYMENT_REJECTED',
      'PAID',
    ];
    for (const status of statuses) {
      expect(getAdminPaymentStatusPresentation(status, 'en').label).not.toBe(status);
      expect(getAdminPaymentStatusPresentation(status, 'ar').label).toMatch(/[\u0600-\u06ff]/u);
    }
    expect(getAdminPaymentStatusPresentation('CONFIRMED', 'en').label).toBe(
      'Unknown payment status',
    );
  });

  it('derives only safe next actions from existing workflow evidence', () => {
    expect(getAdminOrderNextAction(order({ status: 'CANCELLED' }), 'en').title).toBe(
      'Cancelled order',
    );
    expect(getAdminOrderNextAction(order({ status: 'COMPLETED' }), 'en').title).toBe(
      'Completed order',
    );
    expect(
      getAdminOrderNextAction(order({ paymentStatus: 'FINAL_PAYMENT_SUBMITTED' }), 'en').title,
    ).toBe('Review final payment');
    expect(
      getAdminOrderNextAction(
        order({ paymentStatus: 'FINAL_PAYMENT_PENDING', finalPaymentMethod: 'CASH_AT_SHOP' }),
        'en',
      ).title,
    ).toBe('Review cash final payment');
    expect(
      getAdminOrderNextAction(order({ paymentStatus: 'FINAL_PAYMENT_REJECTED' }), 'en').title,
    ).toBe('Waiting final payment');
    expect(getAdminOrderNextAction(order({ paymentStatus: 'PAID' }), 'en').title).toBe(
      'Ready to deliver',
    );
    expect(
      getAdminOrderNextAction(
        order({
          items: [
            {
              sheinBatchItems: [{ batch: { status: 'SHIPPING' } }],
            },
          ] as unknown as AdminOrder['items'],
        }),
        'en',
      ).title,
    ).toBe('Track in SHEIN Batch');
    expect(getAdminOrderNextAction(order(), 'en').title).toBe('Add to SHEIN Batch');
    expect(
      getAdminOrderNextAction(order({ paymentStatus: 'DEPOSIT_PENDING' }), 'en').title,
    ).toBe('Review order details');
    expect(getAdminOrderNextAction(order(), 'ar').title).toBe('إضافة إلى دفعة شي إن');
  });

  it('restores valid URL state and safely falls back from invalid values', () => {
    expect(
      getOrderFiltersFromSearchParams(
        new URLSearchParams('workflow=COMPLETED&search=RS-123&page=3'),
      ),
    ).toEqual({ workflow: 'COMPLETED', search: 'RS-123', page: 3 });
    expect(
      getOrderFiltersFromSearchParams(new URLSearchParams('workflow=INVALID&page=-2')),
    ).toEqual({ workflow: DEFAULT_ORDER_WORKFLOW, search: '', page: 1 });
  });

  it('serializes only supported state and omits default filters', () => {
    const filters = { workflow: 'COMPLETED' as const, search: '  Mona  ', page: 2 };
    expect(buildOrderUrlSearchParams(filters).toString()).toBe(
      'workflow=COMPLETED&search=Mona&page=2',
    );
    expect(buildOrderQuery(filters)).toBe('&page=2&workflow=COMPLETED&search=Mona');
    expect(
      buildOrderUrlSearchParams({ workflow: DEFAULT_ORDER_WORKFLOW, search: '', page: 1 }).toString(),
    ).toBe('');
    expect(hasActiveOrderFilters(filters)).toBe(true);
    expect(
      hasActiveOrderFilters({ workflow: DEFAULT_ORDER_WORKFLOW, search: '', page: 4 }),
    ).toBe(false);
  });
});
