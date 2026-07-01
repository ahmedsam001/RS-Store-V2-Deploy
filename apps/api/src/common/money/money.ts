import { BadRequestException } from '@nestjs/common';

const moneyPattern = /^\d+(?:\.\d{1,2})?$/;

export function moneyStringToMinorUnits(value: string | number | null | undefined, fieldName = 'amount'): number {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException(`${fieldName} must be a non-negative integer minor-unit amount`);
    }
    return value;
  }

  if (typeof value !== 'string' || !moneyPattern.test(value.trim())) {
    throw new BadRequestException(`${fieldName} must be a valid money amount`);
  }

  const [whole, fraction = ''] = value.trim().split('.');
  const minor = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0'), 10);
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new BadRequestException(`${fieldName} is outside the supported range`);
  }

  return minor;
}

export function minorUnitsToMoneyString(value: number): string {
  const safeValue = Number.isSafeInteger(value) ? value : 0;
  const sign = safeValue < 0 ? '-' : '';
  const absolute = Math.abs(safeValue);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

const percentPattern = /^\d{1,3}(?:\.\d{1,2})?$/;

export function calculatePercentDiscountMinorUnits(amountMinorUnits: number, percent: string | number): number {
  const basisPoints = percentToBasisPoints(percent);
  return Math.floor((amountMinorUnits * basisPoints) / 10000);
}

export function percentToBasisPoints(percent: string | number): number {
  const rawValue = typeof percent === 'number' ? String(percent) : percent.trim();

  if (!percentPattern.test(rawValue)) {
    throw new BadRequestException('Discount percent must be between 0 and 100');
  }

  const [whole, fraction = ''] = rawValue.split('.');
  const basisPoints = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0'), 10);

  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
    throw new BadRequestException('Discount percent must be between 0 and 100');
  }

  return basisPoints;
}
