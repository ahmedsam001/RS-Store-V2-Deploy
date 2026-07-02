import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { CookieOptions, Request, Response } from 'express';
import { sha256 } from '../../../common/utils/hash.util';
import { clientIp, parseCookieHeader, userAgent } from '../../../common/utils/request.util';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  language: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

export type AuthSessionUser = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

export type AuthSessionRecord = {
  id: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date | null;
  user: AuthSessionUser;
};

export type CreatedAuthSession = {
  csrfToken: string;
  expiresAt: Date;
  user: AuthSessionUser;
};

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(params: {
    userId: string;
    rememberMe: boolean;
    request: Request;
    response: Response;
  }): Promise<CreatedAuthSession> {
    await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const sessionToken = this.randomToken();
    const csrfToken = this.randomToken();
    const ttlSeconds = params.rememberMe
      ? this.configService.getOrThrow<number>('REMEMBER_ME_TTL_SECONDS')
      : this.configService.getOrThrow<number>('SESSION_TTL_SECONDS');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: params.userId,
        tokenHash: sha256(sessionToken),
        csrfTokenHash: sha256(csrfToken),
        rememberMe: params.rememberMe,
        expiresAt,
        ipAddress: clientIp(params.request),
        userAgent: userAgent(params.request),
      },
      select: { user: { select: sessionUserSelect } },
    });

    this.setAuthCookies(params.response, sessionToken, csrfToken, ttlSeconds);
    return { csrfToken, expiresAt, user: session.user };
  }

  async findSessionFromRequest(request: Request): Promise<AuthSessionRecord | null> {
    const token = this.extractSessionToken(request);
    if (!token) {
      return null;
    }

    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash: sha256(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        tokenHash: true,
        csrfTokenHash: true,
        expiresAt: true,
        lastSeenAt: true,
        user: { select: sessionUserSelect },
      },
    });

    if (!session || session.user.status !== 'ACTIVE') {
      return null;
    }

    await this.touchSessionActivity(session.id, session.lastSeenAt);

    return session;
  }

  async verifyCsrf(request: Request, csrfTokenHash: string): Promise<boolean> {
    const cookies = parseCookieHeader(request.headers.cookie);
    const header = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(header) ? header[0] : header;
    const cookieToken = cookies[this.csrfCookieName];

    return Boolean(
      headerToken &&
      cookieToken &&
      headerToken === cookieToken &&
      sha256(headerToken) === csrfTokenHash,
    );
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async revokeUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  csrfTokenFromRequest(request: Request): string | null {
    const cookies = parseCookieHeader(request.headers.cookie);
    return cookies[this.csrfCookieName] ?? null;
  }

  clearAuthCookies(response: Response): void {
    const cookieOptions = this.authCookieOptions;
    response.clearCookie(this.sessionCookieName, {
      ...cookieOptions,
      httpOnly: true,
    });
    response.clearCookie(this.csrfCookieName, {
      ...cookieOptions,
      httpOnly: false,
    });
  }

  private setAuthCookies(
    response: Response,
    sessionToken: string,
    csrfToken: string,
    maxAgeSeconds: number,
  ): void {
    const cookieOptions = this.authCookieOptions;
    response.cookie(this.sessionCookieName, sessionToken, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: maxAgeSeconds * 1000,
    });
    response.cookie(this.csrfCookieName, csrfToken, {
      ...cookieOptions,
      httpOnly: false,
      maxAge: maxAgeSeconds * 1000,
    });
  }

  private async touchSessionActivity(sessionId: string, lastSeenAt: Date | null): Promise<void> {
    const now = new Date();
    const refreshThreshold = new Date(now.getTime() - 5 * 60 * 1000);

    if (lastSeenAt && lastSeenAt > refreshThreshold) {
      return;
    }

    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: refreshThreshold } }],
      },
      data: { lastSeenAt: now },
    });
  }

  private extractSessionToken(request: Request): string | null {
    const cookies = parseCookieHeader(request.headers.cookie);
    const cookieToken = cookies[this.sessionCookieName];
    if (cookieToken) {
      return cookieToken;
    }

    const authorizationHeader = request.headers.authorization;
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }

  private randomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private get sessionCookieName(): string {
    return this.configService.getOrThrow<string>('SESSION_COOKIE_NAME');
  }

  private get csrfCookieName(): string {
    return this.configService.getOrThrow<string>('CSRF_COOKIE_NAME');
  }

  private get authCookieOptions(): Pick<CookieOptions, 'domain' | 'path' | 'sameSite' | 'secure'> {
    const domain = this.configService.get<string>('COOKIE_DOMAIN')?.trim();

    return {
      ...(domain ? { domain } : {}),
      path: '/',
      sameSite: 'lax',
      secure: this.configService.getOrThrow<boolean>('COOKIE_SECURE'),
    };
  }
}
