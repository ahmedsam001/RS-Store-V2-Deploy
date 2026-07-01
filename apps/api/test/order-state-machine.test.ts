import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertOrderTransition } from '../src/modules/orders/order-state-machine';

describe('order state machine', () => {
  it('allows the standard order flow', () => {
    assert.doesNotThrow(() => assertOrderTransition('PENDING', 'CONFIRMED'));
    assert.doesNotThrow(() => assertOrderTransition('CONFIRMED', 'PROCESSING'));
    assert.doesNotThrow(() => assertOrderTransition('PROCESSING', 'SHIPPED'));
    assert.doesNotThrow(() => assertOrderTransition('SHIPPED', 'COMPLETED'));
  });

  it('rejects invalid reverse transitions', () => {
    assert.throws(() => assertOrderTransition('COMPLETED', 'PROCESSING'));
    assert.throws(() => assertOrderTransition('CANCELLED', 'CONFIRMED'));
  });
});
