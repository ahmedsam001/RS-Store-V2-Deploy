import { describe, expect, it } from 'vitest';
import {
  formatOrderCount,
  formatOrderDate,
  formatOrderMoney,
  formatOrderPercent,
  formatOrderPhone,
  toEnglishDigits,
} from '@/features/orders/order-format';

describe('order format helpers', () => {
  it('converts Arabic-Indic and Eastern Arabic-Indic digits to English digits', () => {
    expect(toEnglishDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789');
  });

  it('formats order money with English digits and currency code', () => {
    expect(formatOrderMoney('٣٬٤٧٨٫٥٠', 'EGP')).toBe('EGP 3,478.50');
  });

  it('formats Egyptian pound values for Arabic customer UI', () => {
    expect(formatOrderMoney('٣٬٤٧٨٫٥٠', 'EGP', 'ar')).toBe('3,478.50 ج.م');
  });

  it('formats dates, phones, counts, and percents with English digits', () => {
    expect(formatOrderDate('2026-07-01T10:30:00.000Z')).not.toMatch(/[٠-٩۰-۹]/);
    expect(formatOrderPhone('٠١٠٠٠٠٠٠٠٠')).toBe('0100000000');
    expect(formatOrderCount('١٢')).toBe('12');
    expect(formatOrderPercent('٧٠')).toBe('70%');
  });
});
