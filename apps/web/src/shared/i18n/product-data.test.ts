import { describe, expect, it } from 'vitest';
import { localizeProductText } from '@/shared/i18n/product-data';

describe('product data localization', () => {
  it('translates English product words even when the title already contains Arabic text', () => {
    expect(localizeProductText('فستان Summer Floral', 'ar')).toBe('فستان صيفي مورد');
  });
});
