import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';
import { AuthenticatedRequest } from '../types/authenticated-request';
import { requestPath } from '../utils/request.util';
import { AuthSessionService } from '../../modules/auth/services/auth-session.service';
import { parseAllowedOrigins } from '../middleware/security-headers.middleware';

const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authSessionService: AuthSessionService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf || !writeMethods.has(request.method)) {
      return true;
    }

    if (!this.hasAllowedOrigin(request)) {
      throw new ForbiddenException('Invalid request origin');
    }

    const path = requestPath(request);
    if (this.isExplicitlyPublicAuthWrite(path)) {
      return true;
    }

    const session = await this.authSessionService.findSessionFromRequest(request);
    if (!session) {
      if (this.isExplicitlyGuestStateWrite(path)) {
        return true;
      }

      throw new ForbiddenException('CSRF token is required for write requests');
    }

    const isValid = await this.authSessionService.verifyCsrf(request, session.csrfTokenHash);
    if (!isValid) {
      throw new ForbiddenException('Security token expired. Refresh the page and try again.');
    }

    return true;
  }

  private isExplicitlyPublicAuthWrite(path: string): boolean {
    return (
      path.endsWith('/auth/lookup') ||
      path.endsWith('/auth/login') ||
      path.endsWith('/auth/customer/login') ||
      path.endsWith('/auth/admin/login')
    );
  }

  private isExplicitlyGuestStateWrite(path: string): boolean {
    return path.endsWith('/cart') || path.includes('/cart/') || path.endsWith('/wishlist') || path.includes('/wishlist/');
  }

  private hasAllowedOrigin(request: AuthenticatedRequest): boolean {
    const origin = request.headers.origin;
    if (!origin) {
      return true;
    }

    const allowedOrigins = parseAllowedOrigins(this.configService.getOrThrow<string>('FRONTEND_ORIGIN'));
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    try {
      const parsedOrigin = new URL(origin);
      return parsedOrigin.host === request.headers.host;
    } catch {
      return false;
    }
  }
}
