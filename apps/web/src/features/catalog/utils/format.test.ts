import { describe, expect, it } from 'vitest';
import { formatPrice } from '@/features/catalog/utils/format';

describe('catalog price formatting', () => {
  it('uses Egyptian pound wording for Arabic customer UI', () => {
    expect(formatPrice({ amount: '399', currency: 'EGP' }, 'ar')).toBe('399 ج.م');
  });

  it('uses EGP code for English customer UI', () => {
    expect(formatPrice({ amount: '399', currency: 'EGP' }, 'en')).toBe('EGP 399');
  });
});
