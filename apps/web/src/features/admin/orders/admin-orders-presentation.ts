import type { AdminOrder } from '@/features/admin/api/admin-api';
import {
  labelPaymentStatus,
  labelStatus,
  type AdminStatusTone,
} from '@/features/admin/components/AdminDesign';
import { translateAdminText } from '@/features/admin/i18n/admin-arabic';
import { PATHS } from '@/shared/constants/routes';
import type { Language } from '@/shared/i18n';
import type { OrderPaymentStatus, OrderStatus } from '@/shared/types/OrderTypes';

export type OrderWorkflowTab =
  | 'READY_FOR_SHEIN_BATCH'
  | 'IN_SHEIN_BATCH'
  | 'WAITING_FINAL_PAYMENT'
  | 'READY_TO_DELIVER'
  | 'COMPLETED'
  | 'CANCELLED';

export type AdminOrderFilters = {
  search: string;
  workflow: OrderWorkflowTab;
  page: number;
};

export type AdminOrderNextAction = {
  title: string;
  description: string;
  badge: string;
  tone: AdminStatusTone;
  href?: string;
  cta?: string;
};

export const DEFAULT_ORDER_WORKFLOW: OrderWorkflowTab = 'READY_FOR_SHEIN_BATCH';

export const ORDER_WORKFLOW_TABS: ReadonlyArray<{
  key: OrderWorkflowTab;
  label: string;
  description: string;
}> = [
  {
    key: 'READY_FOR_SHEIN_BATCH',
    label: 'Ready For SHEIN Batch',
    description: 'Deposit approved and ready to be grouped',
  },
  {
    key: 'IN_SHEIN_BATCH',
    label: 'In SHEIN Batch',
    description: 'Already grouped and being tracked',
  },
  {
    key: 'WAITING_FINAL_PAYMENT',
    label: 'Waiting Final Payment',
    description: 'Items arrived or final payment is under review',
  },
  {
    key: 'READY_TO_DELIVER',
    label: 'Ready To Deliver',
    description: 'Fully paid and ready for handover',
  },
  { key: 'COMPLETED', label: 'Completed', description: 'Closed customer orders' },
  { key: 'CANCELLED', label: 'Cancelled', description: 'Cancelled customer orders' },
];

const ORDER_STATUSES = new Set<OrderStatus>([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
]);
const PAYMENT_STATUSES = new Set<OrderPaymentStatus>([
  'DEPOSIT_PENDING',
  'DEPOSIT_SUBMITTED',
  'DEPOSIT_REJECTED',
  'DEPOSIT_APPROVED',
  'FINAL_PAYMENT_PENDING',
  'FINAL_PAYMENT_SUBMITTED',
  'FINAL_PAYMENT_REJECTED',
  'PAID',
]);

export function getAdminOrderStatusPresentation(
  value: string,
  language: Language,
): { label: string; tone: AdminStatusTone } {
  if (!ORDER_STATUSES.has(value as OrderStatus)) {
    return { label: localize('Unknown order status', language), tone: 'neutral' };
  }

  const tone: AdminStatusTone =
    value === 'COMPLETED'
      ? 'success'
      : value === 'CANCELLED'
        ? 'danger'
        : value === 'PENDING'
          ? 'neutral'
          : 'info';
  return { label: localize(labelStatus(value), language), tone };
}

export function getAdminPaymentStatusPresentation(
  value: string,
  language: Language,
): { label: string; tone: AdminStatusTone } {
  if (!PAYMENT_STATUSES.has(value as OrderPaymentStatus)) {
    return { label: localize('Unknown payment status', language), tone: 'neutral' };
  }

  const tone: AdminStatusTone =
    value === 'PAID'
      ? 'success'
      : value.endsWith('_REJECTED')
        ? 'danger'
        : value.endsWith('_SUBMITTED') || value === 'FINAL_PAYMENT_PENDING'
          ? 'warning'
          : value.endsWith('_APPROVED')
            ? 'info'
            : 'neutral';
  return { label: localize(labelPaymentStatus(value), language), tone };
}

export function getAdminOrderNextAction(
  order: AdminOrder,
  language: Language,
): AdminOrderNextAction {
  const action = getEnglishNextAction(order);
  return {
    ...action,
    title: localize(action.title, language),
    description: localize(action.description, language),
    badge: localize(action.badge, language),
    cta: action.cta ? localize(action.cta, language) : undefined,
  };
}

export function getOrderFiltersFromSearchParams(params: URLSearchParams): AdminOrderFilters {
  const workflow = isOrderWorkflowTab(params.get('workflow'))
    ? (params.get('workflow') as OrderWorkflowTab)
    : DEFAULT_ORDER_WORKFLOW;
  const pageValue = Number(params.get('page') ?? '1');
  return {
    search: params.get('search')?.slice(0, 120) ?? '',
    workflow,
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export function buildOrderUrlSearchParams(filters: AdminOrderFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.workflow !== DEFAULT_ORDER_WORKFLOW) params.set('workflow', filters.workflow);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function buildOrderQuery(filters: AdminOrderFilters): string {
  const params = new URLSearchParams({
    page: String(filters.page),
    workflow: filters.workflow,
  });
  if (filters.search.trim()) params.set('search', filters.search.trim());
  return `&${params.toString()}`;
}

export function hasActiveOrderFilters(filters: AdminOrderFilters): boolean {
  return Boolean(filters.search.trim() || filters.workflow !== DEFAULT_ORDER_WORKFLOW);
}

export function isOrderWorkflowTab(value: string | null): value is OrderWorkflowTab {
  return ORDER_WORKFLOW_TABS.some((tab) => tab.key === value);
}

function getEnglishNextAction(order: AdminOrder): AdminOrderNextAction {
  if (order.status === 'CANCELLED') {
    return {
      title: 'Cancelled order',
      description: 'This order is closed and should not move through batching or delivery.',
      badge: 'Cancelled',
      tone: 'danger',
    };
  }
  if (order.status === 'COMPLETED') {
    return {
      title: 'Completed order',
      description: 'The customer order is fully closed.',
      badge: 'Completed',
      tone: 'success',
    };
  }
  if (order.paymentStatus === 'FINAL_PAYMENT_SUBMITTED') {
    return {
      title: 'Review final payment',
      description: 'The customer uploaded final payment proof. Review it from Payments Review.',
      badge: 'Needs payment review',
      tone: 'warning',
      href: PATHS.adminPaymentsReview,
      cta: 'Open Payments Review',
    };
  }
  if (
    order.paymentStatus === 'FINAL_PAYMENT_PENDING' &&
    order.finalPaymentMethod === 'CASH_AT_SHOP'
  ) {
    return {
      title: 'Review cash final payment',
      description:
        'The customer selected cash at store. Confirm the received amount from Payments Review.',
      badge: 'Cash review',
      tone: 'warning',
      href: PATHS.adminPaymentsReview,
      cta: 'Open Payments Review',
    };
  }
  if (
    order.paymentStatus === 'FINAL_PAYMENT_PENDING' ||
    order.paymentStatus === 'FINAL_PAYMENT_REJECTED'
  ) {
    return {
      title: 'Waiting final payment',
      description: 'The customer should pay the remaining amount before delivery.',
      badge: 'Waiting final payment',
      tone: 'warning',
    };
  }
  if (order.paymentStatus === 'PAID') {
    return {
      title: 'Ready to deliver',
      description: 'The order is fully paid. Mark it completed after handover.',
      badge: 'Ready to deliver',
      tone: 'success',
    };
  }
  if (hasActiveBatch(order)) {
    return {
      title: 'Track in SHEIN Batch',
      description:
        'This order is already inside a SHEIN batch. Track shipment progress from SHEIN Batches.',
      badge: 'In batch',
      tone: 'info',
      href: PATHS.adminSheinBatches,
      cta: 'Open SHEIN Batches',
    };
  }
  if (order.paymentStatus === 'DEPOSIT_APPROVED') {
    return {
      title: 'Add to SHEIN Batch',
      description: 'Deposit is approved. Add this order or its products to the next SHEIN batch.',
      badge: 'Ready for batch',
      tone: 'info',
      href: PATHS.adminSheinBatches,
      cta: 'Open SHEIN Batches',
    };
  }
  return {
    title: 'Review order details',
    description: 'The current status does not identify a safe next action.',
    badge: 'Review required',
    tone: 'neutral',
  };
}

function hasActiveBatch(order: AdminOrder): boolean {
  return Boolean(
    order.items?.some((item) =>
      item.sheinBatchItems?.some(
        (tracking) => !['CANCELLED', 'DELIVERED'].includes(tracking.batch.status),
      ),
    ),
  );
}

function localize(value: string, language: Language): string {
  return language === 'ar' ? translateAdminText(value).trim() : value;
}
