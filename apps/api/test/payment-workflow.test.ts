import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentMethod } from '@prisma/client';
import {
  buildCheckoutPaymentSnapshot,
  calculatePercentAmount,
} from '../src/modules/orders/payment-workflow';

test('calculates deposit snapshot and Vodafone fee from deposit amount', () => {
  const snapshot = buildCheckoutPaymentSnapshot(10000, 50, 'vodafone', {
    depositMinPercent: 50,
    vodafoneFeePercent: 1,
  });
  assert.equal(snapshot.depositPaymentMethod, PaymentMethod.VODAFONE);
  assert.equal(snapshot.depositPaymentFeeAmount, 50);
  assert.equal(snapshot.depositAmount, 5050);
  assert.equal(snapshot.remainingAmount, 5000);
  assert.equal(snapshot.totalAmount, 10050);
});

test('calculates percent amounts in integer minor units', () => {
  assert.equal(calculatePercentAmount(999, 50), 500);
});
