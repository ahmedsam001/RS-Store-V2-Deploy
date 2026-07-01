import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculatePercentDiscountMinorUnits,
  minorUnitsToMoneyString,
  moneyStringToMinorUnits,
  percentToBasisPoints,
} from '../src/common/money/money';

describe('money minor units', () => {
  it('converts decimal strings to integer minor units', () => {
    assert.equal(moneyStringToMinorUnits('100.50'), 10050);
    assert.equal(moneyStringToMinorUnits('100'), 10000);
    assert.equal(moneyStringToMinorUnits('0.99'), 99);
  });

  it('formats integer minor units back to money strings', () => {
    assert.equal(minorUnitsToMoneyString(10050), '100.50');
    assert.equal(minorUnitsToMoneyString(99), '0.99');
  });

  it('calculates percentage discounts using integer basis points', () => {
    assert.equal(percentToBasisPoints('10.50'), 1050);
    assert.equal(calculatePercentDiscountMinorUnits(10050, '10.00'), 1005);
    assert.equal(calculatePercentDiscountMinorUnits(999, '12.50'), 124);
  });
});
