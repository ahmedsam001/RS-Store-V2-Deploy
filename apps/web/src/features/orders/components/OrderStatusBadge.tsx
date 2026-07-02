import { Badge } from '@/shared/components/ui/Badge';
import type {
  OrderItemStatus,
  OrderPaymentStatus,
  OrderStatus,
  PaymentProofStatus,
} from '@/shared/types/OrderTypes';

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Pending Review',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const paymentStatusLabels: Record<OrderPaymentStatus, string> = {
  DEPOSIT_PENDING: 'Awaiting Deposit Proof',
  DEPOSIT_SUBMITTED: 'Deposit Under Review',
  DEPOSIT_REJECTED: 'Deposit Proof Rejected',
  DEPOSIT_APPROVED: 'Deposit Approved',
  FINAL_PAYMENT_PENDING: 'Awaiting Final Payment',
  FINAL_PAYMENT_SUBMITTED: 'Final Payment Under Review',
  FINAL_PAYMENT_REJECTED: 'Final Payment Proof Rejected',
  PAID: 'Fully Paid',
};

const itemStatusLabels: Record<OrderItemStatus, string> = {
  PENDING: 'Preparing',
  SHEIN: 'SHEIN Shipping',
  KUWAIT: 'Kuwait',
  CUSTOMS: 'Customs',
  EGYPT: 'Egypt',
  SHOP: 'Store',
  CANCELLED: 'Cancelled',
};

const proofStatusLabels: Record<PaymentProofStatus, string> = {
  SUBMITTED: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={status === 'CANCELLED' ? 'secondary' : 'default'}>
      {orderStatusLabels[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: OrderPaymentStatus }) {
  return (
    <Badge variant={status.includes('REJECTED') ? 'outline' : 'secondary'}>
      {paymentStatusLabels[status]}
    </Badge>
  );
}

export function OrderItemStatusLabel({ status }: { status: OrderItemStatus }) {
  return <span>{itemStatusLabels[status]}</span>;
}

export function PaymentProofStatusBadge({ status }: { status: PaymentProofStatus }) {
  return (
    <Badge variant={status === 'REJECTED' ? 'outline' : 'secondary'}>
      {proofStatusLabels[status]}
    </Badge>
  );
}
