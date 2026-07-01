import { BadRequestException } from '@nestjs/common';
import { OrderItemStatus, OrderPaymentStatus, OrderStatus, PaymentProofStatus, PaymentProofType } from '@prisma/client';

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const allowedItemTransitions: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ['SHEIN', 'CANCELLED'],
  SHEIN: ['KUWAIT', 'CANCELLED'],
  KUWAIT: ['CUSTOMS', 'CANCELLED'],
  CUSTOMS: ['EGYPT', 'CANCELLED'],
  EGYPT: ['SHOP', 'CANCELLED'],
  SHOP: [],
  CANCELLED: [],
};

export function assertOrderTransition(current: OrderStatus, next: OrderStatus): void {
  if (current === next) return;
  if (!allowedOrderTransitions[current].some((allowed) => allowed === next)) {
    throw new BadRequestException(`Invalid order status transition from ${current} to ${next}`);
  }
}

export function assertOrderItemTransition(current: OrderItemStatus, next: OrderItemStatus): void {
  if (current === next) return;
  if (!allowedItemTransitions[current].some((allowed) => allowed === next)) {
    throw new BadRequestException(`Invalid item status transition from ${current} to ${next}`);
  }
}

export function assertPaymentProofCanBeReviewed(
  proofStatus: PaymentProofStatus,
  proofType: PaymentProofType,
  orderPaymentStatus: OrderPaymentStatus,
): void {
  if (proofStatus !== 'SUBMITTED') {
    throw new BadRequestException('Payment proof has already been reviewed');
  }

  if (proofType === 'DEPOSIT' && orderPaymentStatus !== 'DEPOSIT_SUBMITTED') {
    throw new BadRequestException('Deposit proof is not pending review for this order');
  }

  if (proofType === 'FINAL_PAYMENT' && orderPaymentStatus !== 'FINAL_PAYMENT_SUBMITTED') {
    throw new BadRequestException('Final payment proof is not pending review for this order');
  }
}
