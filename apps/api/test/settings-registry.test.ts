import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SettingScope } from '@prisma/client';
import {
  getSettingDefinition,
  validateSettingValue,
} from '../src/modules/settings/settings-registry';

describe('settings registry validation', () => {
  it('marks required settings explicitly', () => {
    assert.equal(getSettingDefinition('store.name')?.required, true);
    assert.equal(getSettingDefinition('store.currency')?.required, true);
    assert.equal(getSettingDefinition('shein.import.sarExchangeRate')?.required, true);
    assert.equal(getSettingDefinition('store.instagram')?.required, false);
    assert.equal(getSettingDefinition('store.phone')?.required, false);
    assert.equal(getSettingDefinition('store.whatsapp')?.required, false);
  });

  it('accepts empty optional values', () => {
    for (const value of ['', null, undefined]) {
      assert.deepEqual(validateSettingValue('store.instagram', value, SettingScope.PUBLIC), {
        value: '',
        scope: SettingScope.PUBLIC,
      });
    }
  });

  it('rejects empty required values with the field name', () => {
    assert.throws(
      () => validateSettingValue('shein.import.sarExchangeRate', '', SettingScope.ADMIN),
      /SHEIN SAR exchange rate is required/,
    );
  });

  it('validates non-empty optional values by type', () => {
    assert.throws(
      () => validateSettingValue('store.instagram', 'not-a-url', SettingScope.PUBLIC),
      /Instagram URL must be a valid URL/,
    );
    assert.equal(
      validateSettingValue('store.phone', '01018313022', SettingScope.PUBLIC).value,
      '01018313022',
    );
  });
});
