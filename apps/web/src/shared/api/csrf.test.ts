import { describe, expect, it, vi } from 'vitest';
import { getCsrfCookieName, getCsrfToken } from '@/shared/api/csrf';

describe('CSRF helpers', () => {
  it('uses the Vite configured CSRF cookie name when present', () => {
    vi.stubEnv('VITE_CSRF_COOKIE_NAME', 'custom_csrf');
    document.cookie = 'custom_csrf=secure-token; path=/';

    expect(getCsrfCookieName()).toBe('custom_csrf');
    expect(getCsrfToken()).toBe('secure-token');
  });

  it('falls back to the default cookie name when env is missing', () => {
    document.cookie = 'rs_csrf=default-token; path=/';

    expect(getCsrfCookieName()).toBe('rs_csrf');
    expect(getCsrfToken()).toBe('default-token');
  });
});
