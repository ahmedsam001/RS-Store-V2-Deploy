import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthSessionService } from '../../modules/auth/services/auth-session.service';
import { AuthenticatedRequest } from '../types/authenticated-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authSessionService: AuthSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.authSessionService.findSessionFromRequest(request);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.authSession = session;
    request.user = {
      id: session.user.id,
      role: session.user.role,
      sessionId: session.id,
    };

    return true;
  }
}
