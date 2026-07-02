import { BadRequestException } from '@nestjs/common';

export const SUPPORTED_SHEIN_COUNTRIES = [
  { code: 'KW', nameEn: 'Kuwait' },
  { code: 'SA', nameEn: 'Saudi Arabia' },
  { code: 'AE', nameEn: 'United Arab Emirates' },
  { code: 'QA', nameEn: 'Qatar' },
  { code: 'BH', nameEn: 'Bahrain' },
  { code: 'OM', nameEn: 'Oman' },
] as const;

export type SheinCountryCode = (typeof SUPPORTED_SHEIN_COUNTRIES)[number]['code'];

export const SUPPORTED_SHEIN_COUNTRY_CODES = SUPPORTED_SHEIN_COUNTRIES.map(
  (country) => country.code,
) as SheinCountryCode[];
export const DEFAULT_SHEIN_COUNTRY: SheinCountryCode = 'KW';
export const FIXED_SHEIN_CURRENCY = 'SAR';
export const DEFAULT_SHEIN_LANGUAGE = 'en';
export const SHEIN_COUNTRY_SETTING_KEY = 'shein.import.country';
export const SHEIN_CURRENCY_SETTING_KEY = 'shein.import.currency';
export const SHEIN_LANGUAGE_SETTING_KEY = 'shein.import.language';

export type SheinMarketplaceSettings = {
  countryCode: SheinCountryCode;
  currencyCode: typeof FIXED_SHEIN_CURRENCY;
  language: string;
  countries: typeof SUPPORTED_SHEIN_COUNTRIES;
};

export function isSupportedSheinCountry(value: unknown): value is SheinCountryCode {
  return (
    typeof value === 'string' &&
    SUPPORTED_SHEIN_COUNTRY_CODES.includes(value.trim().toUpperCase() as SheinCountryCode)
  );
}

export function normalizeSheinCountry(
  value: unknown,
  fallback: SheinCountryCode = DEFAULT_SHEIN_COUNTRY,
): SheinCountryCode {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return isSupportedSheinCountry(candidate) ? candidate : fallback;
}

export function assertSupportedSheinCountry(value: unknown): SheinCountryCode {
  const candidate = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!isSupportedSheinCountry(candidate)) {
    throw new BadRequestException('Selected country is not supported for SHEIN import');
  }
  return candidate;
}

export function normalizeSheinLanguage(value: unknown): string {
  const language = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (['ar', 'en'].includes(language)) {
    return language;
  }
  return DEFAULT_SHEIN_LANGUAGE;
}

export function assertFixedSheinCurrency(value: unknown): typeof FIXED_SHEIN_CURRENCY {
  const currency = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (currency && currency !== FIXED_SHEIN_CURRENCY) {
    throw new BadRequestException('SHEIN import currency must be SAR (Saudi Riyal)');
  }
  return FIXED_SHEIN_CURRENCY;
}
