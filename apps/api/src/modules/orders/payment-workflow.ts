import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import {
  DEPOSIT_PERCENT_CHOICES,
  DepositPaymentMethodInput,
  DepositPercentInput,
} from './dto/checkout-order.dto';
import type { SubmitFinalPaymentDto } from './dto/submit-final-payment.dto';

export type DepositPercent = DepositPercentInput;

export type PaymentSettingsSnapshot = {
  depositMinPercent: DepositPercent;
  vodafoneFeePercent: number;
};

export type CheckoutPaymentSnapshot = {
  depositPaymentMethod: PaymentMethod;
  depositPaymentFeeAmount: number;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
};

export type FinalPaymentSnapshot = {
  finalPaymentMethod: PaymentMethod;
  finalPaymentFeeAmount: number;
  finalAmountDue: number;
  totalAmount: number;
};

export function assertDepositPercent(percent: DepositPercent, minPercent: DepositPercent): void {
  if (!DEPOSIT_PERCENT_CHOICES.includes(percent) || percent < minPercent) {
    throw new BadRequestException(`Deposit must be at least ${minPercent}%`);
  }
}

export function normalizeDepositPercent(value: number, fallback: DepositPercent): DepositPercent {
  return DEPOSIT_PERCENT_CHOICES.includes(value as DepositPercent)
    ? (value as DepositPercent)
    : fallback;
}

export function toDepositPaymentMethod(method: DepositPaymentMethodInput): PaymentMethod {
  return method === 'vodafone' ? PaymentMethod.VODAFONE : PaymentMethod.INSTAPAY;
}

export function toFinalPaymentMethod(method: SubmitFinalPaymentDto['method']): PaymentMethod {
  if (method === 'cash_at_shop') return PaymentMethod.CASH_AT_SHOP;
  if (method === 'vodafone') return PaymentMethod.VODAFONE;
  return PaymentMethod.INSTAPAY;
}

export function calculatePercentAmount(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

export function buildCheckoutPaymentSnapshot(
  subtotal: number,
  depositPercent: DepositPercent,
  method: DepositPaymentMethodInput,
  settings: PaymentSettingsSnapshot,
): CheckoutPaymentSnapshot {
  assertDepositPercent(depositPercent, settings.depositMinPercent);
  const depositPaymentMethod = toDepositPaymentMethod(method);
  const depositBaseAmount = calculatePercentAmount(subtotal, depositPercent);
  const depositPaymentFeeAmount =
    depositPaymentMethod === PaymentMethod.VODAFONE
      ? calculatePercentAmount(depositBaseAmount, settings.vodafoneFeePercent)
      : 0;
  const totalAmount = subtotal + depositPaymentFeeAmount;
  const depositAmount = depositBaseAmount + depositPaymentFeeAmount;
  const remainingAmount = Math.max(0, totalAmount - depositAmount);
  return {
    depositPaymentMethod,
    depositPaymentFeeAmount,
    totalAmount,
    depositAmount,
    remainingAmount,
  };
}

export function buildFinalPaymentSnapshot({
  currentTotalAmount,
  remainingAmount,
  finalPaymentMethod,
  settings,
}: {
  currentTotalAmount: number;
  remainingAmount: number;
  finalPaymentMethod: PaymentMethod;
  settings: Pick<PaymentSettingsSnapshot, 'vodafoneFeePercent'>;
}): FinalPaymentSnapshot {
  const finalPaymentFeeAmount =
    finalPaymentMethod === PaymentMethod.VODAFONE
      ? calculatePercentAmount(remainingAmount, settings.vodafoneFeePercent)
      : 0;

  return {
    finalPaymentMethod,
    finalPaymentFeeAmount,
    finalAmountDue: remainingAmount + finalPaymentFeeAmount,
    totalAmount: currentTotalAmount,
  };
}
