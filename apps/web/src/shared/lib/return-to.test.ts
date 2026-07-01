import { describe, expect, it } from 'vitest';
import { buildCustomerAuthPath, sanitizeReturnTo } from '@/shared/lib/return-to';

describe('customer returnTo sanitizer', () => {
  it('allows safe customer relative paths', () => {
    expect(sanitizeReturnTo('/checkout')).toBe('/checkout');
    expect(sanitizeReturnTo('/orders/123')).toBe('/orders/123');
    expect(sanitizeReturnTo('/profile?tab=orders')).toBe('/profile?tab=orders');
  });

  it('rejects external and dangerous URLs', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBe('/profile');
    expect(sanitizeReturnTo('//evil.com')).toBe('/profile');
    expect(sanitizeReturnTo('javascript:alert(1)')).toBe('/profile');
    expect(sanitizeReturnTo('/\\evil.com')).toBe('/profile');
  });

  it('rejects admin paths for customer auth redirects', () => {
    expect(sanitizeReturnTo('/admin')).toBe('/profile');
    expect(sanitizeReturnTo('/admin/login')).toBe('/profile');
  });

  it('builds encoded login links for safe returnTo paths', () => {
    expect(buildCustomerAuthPath('/login', '/checkout')).toBe('/login?returnTo=%2Fcheckout');
  });
});
