import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { CheckoutOrderDto } from './dto/checkout-order.dto';

export function normalizeCheckoutIdempotencyKey(value: string | undefined | null): string {
  const key = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(key)) {
    throw new BadRequestException('A valid checkout idempotency key is required');
  }
  return key;
}

export function hashCheckoutRequest(dto: CheckoutOrderDto): string {
  const payload = {
    customerName: dto.customerName.trim(),
    customerPhone: dto.customerPhone.trim(),
    customerEmail: dto.customerEmail?.trim() || null,
    shippingAddress: dto.shippingAddress.trim(),
    notes: dto.notes?.trim() || null,
    depositPercent: dto.depositPercent,
    paymentMethod: dto.paymentMethod,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function assertCheckoutIdempotencyReplay(
  existingHash: string,
  requestHash: string,
  hasOrder: boolean,
): void {
  if (existingHash !== requestHash) {
    throw new ConflictException(
      'Idempotency key was already used with a different checkout request',
    );
  }
  if (!hasOrder) {
    throw new ConflictException('Checkout is already being processed');
  }
}
