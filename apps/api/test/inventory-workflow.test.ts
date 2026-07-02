import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReserveStock,
  getAvailableStock,
  INVENTORY_RESERVATION_STRATEGY,
} from '../src/modules/orders/inventory-workflow';

test('uses reserve-on-order-created inventory strategy', () => {
  assert.equal(INVENTORY_RESERVATION_STRATEGY, 'RESERVE_ON_ORDER_CREATED');
});

test('calculates available stock after reservations', () => {
  assert.equal(getAvailableStock(3, 2), 1);
  assert.equal(canReserveStock(3, 2, 1), true);
  assert.equal(canReserveStock(3, 2, 2), false);
});
