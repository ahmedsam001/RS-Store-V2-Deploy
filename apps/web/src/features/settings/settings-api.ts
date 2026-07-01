import { apiRequest } from '@/shared/api/http-client';

export type StorefrontSettings = Record<string, unknown>;

export const settingsApi = {
  storefront: () => apiRequest<StorefrontSettings>('/settings/public/storefront'),
};

export function readSetting(
  settings: StorefrontSettings | null,
  key: string,
  fallback = '',
): string {
  const value = settings?.[key];
  return value === undefined || value === null ? fallback : String(value);
}
