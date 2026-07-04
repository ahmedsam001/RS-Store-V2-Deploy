const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ENGLISH_DIGITS = '0123456789';

export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/[٠-٩]/g, (digit) => ENGLISH_DIGITS[ARABIC_INDIC_DIGITS.indexOf(digit)] ?? digit)
    .replace(
      /[۰-۹]/g,
      (digit) => ENGLISH_DIGITS[EASTERN_ARABIC_INDIC_DIGITS.indexOf(digit)] ?? digit,
    );
}

export function formatOrderMoney(
  amount: string | number,
  currency: string,
  language?: 'ar' | 'en',
): string {
  const value = typeof amount === 'number' ? amount / 100 : parseOrderAmount(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  const normalizedCurrency = toEnglishDigits(currency || 'EGP').toUpperCase();

  if (language && normalizedCurrency === 'EGP') {
    const formattedAmount = toEnglishDigits(
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: Number.isInteger(safeValue) ? 0 : 2,
        minimumFractionDigits: Number.isInteger(safeValue) ? 0 : 2,
        numberingSystem: 'latn',
      }).format(safeValue),
    );

    return language === 'ar' ? `${formattedAmount} ج.م` : `EGP ${formattedAmount}`;
  }

  return toEnglishDigits(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'code',
      maximumFractionDigits: 2,
      numberingSystem: 'latn',
    })
      .format(safeValue)
      .replace(/\u00a0/g, ' '),
  );
}

export function formatOrderDate(value: string): string {
  return toEnglishDigits(
    new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      calendar: 'gregory',
      numberingSystem: 'latn',
    }).format(new Date(value)),
  );
}

export function formatOrderNumber(value: string | number | null | undefined): string {
  return toEnglishDigits(value);
}

export function formatOrderPhone(value: string | number | null | undefined): string {
  return toEnglishDigits(value).replace(/\s+/g, '');
}

export function formatOrderCount(value: string | number | null | undefined): string {
  const normalized = Number(normalizeNumericString(value));
  if (!Number.isFinite(normalized)) return toEnglishDigits(value);

  return toEnglishDigits(
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
      numberingSystem: 'latn',
    }).format(normalized),
  );
}

export function formatOrderPercent(value: string | number | null | undefined): string {
  return `${formatOrderCount(value)}%`;
}

export function formatOrderText(value: string | number | null | undefined): string {
  return toEnglishDigits(value);
}

function parseOrderAmount(amount: string): number {
  const trimmed = normalizeNumericString(amount);
  if (trimmed.includes('.')) {
    return Number(trimmed);
  }

  return Number(trimmed) / 100;
}

function normalizeNumericString(value: string | number | null | undefined): string {
  return toEnglishDigits(value).trim().replace(/[٬,]/g, '').replace(/٫/g, '.');
}
