import { BadRequestException, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthSessionService } from '../auth/services/auth-session.service';
import { GuestSessionService } from './guest-session.service';
import { ShopperContext } from './shopper-context.types';

@Injectable()
export class ShopperContextService {
  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  async resolve(request: Request, response?: Response): Promise<ShopperContext> {
    const session = await this.authSessionService.findSessionFromRequest(request);
    const guestKey = session
      ? this.guestSessionService.readGuestKey(request)
      : this.guestSessionService.ensureGuestKey(request, response);

    if (session) {
      return { userId: session.user.id, guestKey, isAuthenticated: true };
    }

    if (!guestKey) {
      throw new BadRequestException('Guest identity is required');
    }

    return { guestKey, isAuthenticated: false };
  }

  clearGuestIdentity(response: Response): void {
    this.guestSessionService.clearGuestCookie(response);
  }
}
