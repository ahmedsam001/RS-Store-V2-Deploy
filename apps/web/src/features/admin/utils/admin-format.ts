import type { Language } from '@/shared/i18n';

export const ADMIN_FORMAT_FALLBACK = '—';

const ADMIN_LOCALES: Record<Language, string> = {
  ar: 'ar-EG-u-nu-latn',
  en: 'en-GB',
};

type AdminDateInput = string | number | Date | null | undefined;
type AdminNumberInput = string | number | null | undefined;
type AdminDateFormatOptions = { timeZone?: string };

const dateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};
const timeOptions: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};
const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  ...timeOptions,
};

const dateFormatters = createDateFormatters(dateOptions);
const timeFormatters = createDateFormatters(timeOptions, true);
const dateTimeFormatters = createDateFormatters(dateTimeOptions, true);
const numberFormatters: Record<Language, Intl.NumberFormat> = {
  ar: new Intl.NumberFormat(ADMIN_LOCALES.ar),
  en: new Intl.NumberFormat(ADMIN_LOCALES.en),
};
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const MAX_CACHED_CURRENCY_FORMATTERS = 12;

export function adminLocale(language: Language): string {
  return ADMIN_LOCALES[language];
}

export function formatAdminDate(
  value: AdminDateInput,
  language: Language,
  options: AdminDateFormatOptions = {},
): string {
  return formatDateValue(value, language, dateFormatters, dateOptions, options, false);
}

export function formatAdminTime(
  value: AdminDateInput,
  language: Language,
  options: AdminDateFormatOptions = {},
): string {
  return formatDateValue(value, language, timeFormatters, timeOptions, options, true);
}

export function formatAdminDateTime(
  value: AdminDateInput,
  language: Language,
  options: AdminDateFormatOptions = {},
): string {
  return formatDateValue(value, language, dateTimeFormatters, dateTimeOptions, options, true);
}

/** Admin API monetary values are integer minor units. */
export function formatAdminCurrency(
  valueInMinorUnits: AdminNumberInput,
  currency: string,
  language: Language,
): string {
  const amount = parseFiniteNumber(valueInMinorUnits);
  const currencyCode = currency.trim().toUpperCase();
  if (amount === null || !/^[A-Z]{3}$/.test(currencyCode)) return ADMIN_FORMAT_FALLBACK;

  try {
    return getCurrencyFormatter(language, currencyCode).format(amount / 100);
  } catch {
    return ADMIN_FORMAT_FALLBACK;
  }
}

export function formatAdminNumber(value: AdminNumberInput, language: Language): string {
  const number = parseFiniteNumber(value);
  return number === null ? ADMIN_FORMAT_FALLBACK : numberFormatters[language].format(number);
}

function createDateFormatters(
  options: Intl.DateTimeFormatOptions,
  longArabicDayPeriod = false,
): Record<Language, Intl.DateTimeFormat> {
  return {
    ar: new Intl.DateTimeFormat(ADMIN_LOCALES.ar, {
      ...options,
      ...(longArabicDayPeriod ? { dayPeriod: 'long' } : {}),
    }),
    en: new Intl.DateTimeFormat(ADMIN_LOCALES.en, options),
  };
}

function formatDateValue(
  value: AdminDateInput,
  language: Language,
  cachedFormatters: Record<Language, Intl.DateTimeFormat>,
  options: Intl.DateTimeFormatOptions,
  { timeZone }: AdminDateFormatOptions,
  longArabicDayPeriod: boolean,
): string {
  const date = parseDate(value);
  if (!date) return ADMIN_FORMAT_FALLBACK;

  const formatter = timeZone
    ? new Intl.DateTimeFormat(ADMIN_LOCALES[language], {
        ...options,
        ...(language === 'ar' && longArabicDayPeriod ? { dayPeriod: 'long' } : {}),
        timeZone,
      })
    : cachedFormatters[language];
  return formatter.format(date);
}

function parseDate(value: AdminDateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseFiniteNumber(value: AdminNumberInput): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function getCurrencyFormatter(language: Language, currency: string): Intl.NumberFormat {
  const key = `${language}:${currency}`;
  const cached = currencyFormatters.get(key);
  if (cached) return cached;

  if (currencyFormatters.size >= MAX_CACHED_CURRENCY_FORMATTERS) {
    currencyFormatters.clear();
  }

  const formatter = new Intl.NumberFormat(ADMIN_LOCALES[language], {
    style: 'currency',
    currency,
    currencyDisplay: language === 'ar' ? 'symbol' : 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  currencyFormatters.set(key, formatter);
  return formatter;
}
