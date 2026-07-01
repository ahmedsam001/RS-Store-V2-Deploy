export function formatOrderMoney(amount: string | number, currency: string): string {
  const value = typeof amount === 'number' ? amount / 100 : parseOrderAmount(amount);
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function parseOrderAmount(amount: string): number {
  const trimmed = amount.trim();
  if (trimmed.includes('.')) {
    return Number(trimmed);
  }

  return Number(trimmed) / 100;
}
