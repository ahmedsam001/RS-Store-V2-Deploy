import { describe, expect, it } from 'vitest';
import {
  ADMIN_FORMAT_FALLBACK,
  adminLocale,
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminNumber,
  formatAdminTime,
} from './admin-format';

const timestamp = '2026-07-12T18:32:00.000Z';
const utc = { timeZone: 'UTC' } as const;

function normalized(value: string): string {
  return value.replace(/[\u061c\u200e\u200f]/gu, '').replace(/\u00a0/gu, ' ').trim();
}

describe('Admin localized formatting', () => {
  it('uses stable Arabic and English locales', () => {
    expect(adminLocale('ar')).toBe('ar-EG-u-nu-latn');
    expect(adminLocale('en')).toBe('en-GB');
  });

  it('formats Arabic date and time without English periods or leading punctuation', () => {
    const date = normalized(formatAdminDate(timestamp, 'ar', utc));
    const time = normalized(formatAdminTime(timestamp, 'ar', utc));
    const dateTime = normalized(formatAdminDateTime(timestamp, 'ar', utc));

    expect(date).toContain('12');
    expect(date).toContain('يوليو');
    expect(time).toContain('مساءً');
    expect(`${date} ${time} ${dateTime}`).not.toMatch(/\b(?:AM|PM)\b/i);
    expect(dateTime).not.toMatch(/^[,،]/u);
  });

  it('keeps English time and date presentation English', () => {
    expect(normalized(formatAdminDate(timestamp, 'en', utc))).toBe('12 Jul 2026');
    expect(normalized(formatAdminTime(timestamp, 'en', utc))).toMatch(/^6:32 pm$/i);
    expect(normalized(formatAdminDateTime(timestamp, 'en', utc))).not.toMatch(/ص|م/u);
  });

  it('places Arabic EGP currency after the amount with two decimals', () => {
    const parts = new Intl.NumberFormat(adminLocale('ar'), {
      style: 'currency',
      currency: 'EGP',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).formatToParts(952);
    const formatted = normalized(formatAdminCurrency(95_200, 'EGP', 'ar'));

    expect(parts.findIndex((part) => part.type === 'currency')).toBeGreaterThan(
      parts.findIndex((part) => part.type === 'integer'),
    );
    expect(formatted).toContain('952.00');
    expect(formatted).toMatch(/ج\.م/u);
  });

  it('places English EGP before the amount and preserves SAR', () => {
    const egp = normalized(formatAdminCurrency(95_200, 'EGP', 'en'));
    const sar = normalized(formatAdminCurrency(95_200, 'SAR', 'ar'));

    expect(egp).toMatch(/^EGP\s+952\.00$/u);
    expect(sar).toContain('952.00');
    expect(sar).toMatch(/ر\.س/u);
    expect(sar).not.toMatch(/ج\.م|EGP/u);
  });

  it('formats zero and negative minor-unit values without recalculation', () => {
    expect(normalized(formatAdminCurrency(0, 'EGP', 'en'))).toBe('EGP 0.00');
    const negative = normalized(formatAdminCurrency(-12_345, 'EGP', 'en'));
    expect(negative).toContain('EGP');
    expect(negative).toContain('123.45');
    expect(negative).toContain('-');
  });

  it('formats general numeric values with Latin digits in both languages', () => {
    expect(normalized(formatAdminNumber(12_345, 'ar'))).toBe('12,345');
    expect(normalized(formatAdminNumber(12_345, 'en'))).toBe('12,345');
  });

  it('returns a safe fallback for missing or invalid inputs', () => {
    expect(formatAdminDate('not-a-date', 'ar')).toBe(ADMIN_FORMAT_FALLBACK);
    expect(formatAdminDate(null, 'en')).toBe(ADMIN_FORMAT_FALLBACK);
    expect(formatAdminTime(undefined, 'ar')).toBe(ADMIN_FORMAT_FALLBACK);
    expect(formatAdminCurrency(undefined, 'EGP', 'en')).toBe(ADMIN_FORMAT_FALLBACK);
    expect(formatAdminCurrency(Number.NaN, 'EGP', 'ar')).toBe(ADMIN_FORMAT_FALLBACK);
    expect(formatAdminNumber(null, 'en')).toBe(ADMIN_FORMAT_FALLBACK);
  });

  it('does not mutate Date inputs', () => {
    const input = new Date(timestamp);
    const before = input.getTime();
    formatAdminDateTime(input, 'ar', utc);
    expect(input.getTime()).toBe(before);
  });
});
