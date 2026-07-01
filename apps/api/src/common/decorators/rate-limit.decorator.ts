import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit_rule';

export type RateLimitRule = {
  bucket: string;
  limit: number;
  windowMs: number;
};

export function RateLimit(rule: RateLimitRule) {
  return SetMetadata(RATE_LIMIT_KEY, rule);
}
