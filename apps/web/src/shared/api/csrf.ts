const DEFAULT_CSRF_COOKIE_NAME = 'rs_csrf';

export function getCsrfCookieName(): string {
  const configured = import.meta.env.VITE_CSRF_COOKIE_NAME?.trim();
  return configured || DEFAULT_CSRF_COOKIE_NAME;
}

export function getCsrfToken(): string | null {
  return readCookie(getCsrfCookieName());
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !name.trim()) {
    return null;
  }

  const prefix = `${name}=`;
  const value = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}
