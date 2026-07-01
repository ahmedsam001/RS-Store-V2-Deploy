import { PATHS } from '@/shared/constants/routes';

const DEFAULT_CUSTOMER_RETURN_TO = PATHS.profile;

export function sanitizeReturnTo(
  value: string | null | undefined,
  fallback: string = DEFAULT_CUSTOMER_RETURN_TO,
): string {
  return getSafeReturnTo(value, { fallback, allowAdmin: false });
}

export function getSafeReturnTo(
  value: string | null | undefined,
  options: ReturnToOptions = {},
): string {
  const fallback = normalizeFallback(options.fallback);
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!isSafeInternalPath(trimmed)) return fallback;

  try {
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(trimmed, baseOrigin);
    if (parsed.origin !== baseOrigin) return fallback;
    if (!options.allowAdmin && isBlockedCustomerPath(parsed.pathname)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildCustomerAuthPath(path: string, returnTo: string): string {
  const safeReturnTo = sanitizeReturnTo(returnTo, DEFAULT_CUSTOMER_RETURN_TO);
  return `${path}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function buildLoginRedirect(
  location: { pathname: string; search: string; hash: string },
  fallback: string = DEFAULT_CUSTOMER_RETURN_TO,
): string {
  return buildCustomerAuthPath(
    PATHS.login,
    currentPathWithSearch(location.pathname, location.search, location.hash, fallback),
  );
}

export function currentPathWithSearch(
  pathname: string,
  search = '',
  hash = '',
  fallback: string = PATHS.home,
): string {
  return sanitizeReturnTo(`${pathname}${search}${hash}`, fallback);
}

type ReturnToOptions = {
  fallback?: string;
  allowAdmin?: boolean;
};

function normalizeFallback(fallback?: string): string {
  if (!fallback) return DEFAULT_CUSTOMER_RETURN_TO;
  return isSafeInternalPath(fallback) && !isBlockedCustomerPath(fallback)
    ? fallback
    : DEFAULT_CUSTOMER_RETURN_TO;
}

function isSafeInternalPath(value: string): boolean {
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('\\')) return false;
  if (/\/[\\/]/.test(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  if (/javascript:/i.test(value)) return false;
  if (hasControlCharacter(value)) return false;
  return true;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function isBlockedCustomerPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || PATHS.home;
  return normalized.startsWith(PATHS.adminRoot);
}
