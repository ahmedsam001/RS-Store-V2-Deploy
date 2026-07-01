export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  return normalizeEgyptianPhoneNumber(phone) !== null;
}

export function normalizeEgyptianPhoneNumber(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digitsOnly = phone.replace(/\D/g, '');
  const normalized = digitsOnly.startsWith('20') ? `0${digitsOnly.slice(2)}` : digitsOnly;
  return /^01\d{9}$/.test(normalized) ? normalized : null;
}
