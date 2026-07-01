import { BadRequestException } from '@nestjs/common';

const EGYPT_LOCAL_PHONE = /^01\d{9}$/;

export function normalizeEgyptianPhone(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Phone number is required');
  }

  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('20') ? `0${digits.slice(2)}` : digits;

  if (!EGYPT_LOCAL_PHONE.test(normalized)) {
    throw new BadRequestException('Phone number must be an Egyptian mobile number like 01xxxxxxxxx');
  }

  return normalized;
}

export function egyptianPhoneLookupVariants(phone: string): string[] {
  const local = normalizeEgyptianPhone(phone);
  return Array.from(new Set([local, `+2${local}`, `2${local}`]));
}
