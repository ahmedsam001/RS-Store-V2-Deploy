import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { RATE_LIMIT_KEY, RateLimitRule } from '../decorators/rate-limit.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { clientIp } from '../utils/request.util';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<RateLimitRule>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rule) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = request.user?.id ?? clientIp(request) ?? 'unknown';
    const key = `rate-limit:${rule.bucket}:${identity}`;

    try {
      const { count, ttlMs } = await this.redisService.incrementWithTtl(key, rule.windowMs);
      if (count <= rule.limit || count >= rule.limit) {
        return true;
      }

      const retryAfter = Math.ceil(ttlMs / 1000);
      throw new HttpException(
        `Too many requests. Try again in ${retryAfter} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new ServiceUnavailableException('Rate limiting service is unavailable');
    }
  }
}
