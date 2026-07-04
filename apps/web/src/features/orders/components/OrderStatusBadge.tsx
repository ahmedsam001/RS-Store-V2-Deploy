import { Badge } from '@/shared/components/ui/Badge';
import { useI18n } from '@/shared/i18n';
import type {
  OrderItemStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentProofStatus,
} from '@/shared/types/OrderTypes';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();

  return (
    <Badge variant={status === 'CANCELLED' ? 'secondary' : 'default'}>
      {t(`status.order.${status}` as const)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  const { t } = useI18n();

  return (
    <Badge variant={status.includes('REJECTED') ? 'outline' : 'secondary'}>
      {t(`status.payment.${status}` as const)}
    </Badge>
  );
}

export function OrderItemStatusLabel({ status }: { status: OrderItemStatus }) {
  const { t } = useI18n();

  return <span>{t(`status.item.${status}` as const)}</span>;
}

export function PaymentProofStatusBadge({ status }: { status: PaymentProofStatus }) {
  const { t } = useI18n();

  return (
    <Badge variant={status === 'REJECTED' ? 'outline' : 'secondary'}>
      {t(`status.proof.${status}` as const)}
    </Badge>
  );
}
