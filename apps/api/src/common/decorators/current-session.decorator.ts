import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthSessionRecord } from '../../modules/auth/services/auth-session.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSessionRecord => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authSession) {
      throw new UnauthorizedException('Authenticated session is required');
    }

    return request.authSession;
  },
);
