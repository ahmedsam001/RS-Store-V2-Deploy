import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCheckoutIdempotencyReplay, hashCheckoutRequest, normalizeCheckoutIdempotencyKey } from '../src/modules/orders/checkout-idempotency';

test('normalizes valid checkout idempotency key', () => {
  assert.equal(normalizeCheckoutIdempotencyKey(' checkout-key-123456 '), 'checkout-key-123456');
});

test('hashes equivalent checkout requests consistently', () => {
  const first = hashCheckoutRequest({ customerName: ' Ali ', customerPhone: '01000000000', shippingAddress: 'Address 1', depositPercent: 50, paymentMethod: 'instapay' });
  const second = hashCheckoutRequest({ customerName: 'Ali', customerPhone: '01000000000', shippingAddress: 'Address 1', depositPercent: 50, paymentMethod: 'instapay' });
  assert.equal(first, second);
});

test('allows replay when hash matches and order exists', () => {
  assert.doesNotThrow(() => assertCheckoutIdempotencyReplay('a', 'a', true));
});
