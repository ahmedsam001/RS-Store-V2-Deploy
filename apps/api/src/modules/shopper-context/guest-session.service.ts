import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { sha256 } from '../../common/utils/hash.util';
import { parseCookieHeader } from '../../common/utils/request.util';

const guestIdPattern = /^[A-Za-z0-9_-]{32,96}$/;

@Injectable()
export class GuestSessionService {
  constructor(private readonly configService: ConfigService) {}

  readGuestKey(request: Request): string | undefined {
    const token = this.readCookie(request);
    const guestId = token ? this.verifyToken(token) : undefined;
    return guestId ? sha256(guestId) : undefined;
  }

  ensureGuestKey(request: Request, response: Response | undefined): string {
    const existingGuestKey = this.readGuestKey(request);
    if (existingGuestKey) {
      return existingGuestKey;
    }

    if (!response) {
      throw new Error('Response is required to issue a guest identity');
    }

    const guestId = randomBytes(32).toString('base64url');
    response.cookie(this.cookieName, this.signToken(guestId), {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.ttlSeconds * 1000,
    });

    return sha256(guestId);
  }

  clearGuestCookie(response: Response): void {
    response.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax',
      path: '/',
    });
  }

  private readCookie(request: Request): string | undefined {
    return parseCookieHeader(request.headers.cookie)[this.cookieName];
  }

  private signToken(guestId: string): string {
    return `${guestId}.${this.signature(guestId)}`;
  }

  private verifyToken(token: string): string | undefined {
    const [guestId, signature] = token.split('.');
    if (!guestId || !signature || !guestIdPattern.test(guestId)) {
      return undefined;
    }

    const expectedSignature = this.signature(guestId);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return undefined;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer) ? guestId : undefined;
  }

  private signature(guestId: string): string {
    return createHmac('sha256', this.secret).update(guestId).digest('base64url');
  }

  private get cookieName(): string {
    return this.configService.getOrThrow<string>('GUEST_COOKIE_NAME');
  }

  private get secret(): string {
    return this.configService.getOrThrow<string>('GUEST_COOKIE_SECRET');
  }

  private get ttlSeconds(): number {
    return this.configService.getOrThrow<number>('GUEST_TTL_SECONDS');
  }

  private get cookieSecure(): boolean {
    return this.configService.getOrThrow<boolean>('COOKIE_SECURE');
  }
}
