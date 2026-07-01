import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { isStrongPassword } from '../../common/utils/password-policy.util';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CompatibleLoginDto } from './dto/compatible-login.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { LookupDto } from './dto/lookup.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthLookupResponse, AuthMeResponse, AuthResponse, AuthUserResponse, SessionListItem } from './auth.types';
import { AuthSessionService } from './services/auth-session.service';
import type { AuthSessionRecord, AuthSessionUser } from './services/auth-session.service';
import { egyptianPhoneLookupVariants, normalizeEgyptianPhone } from './phone-normalization';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async lookup(dto: LookupDto): Promise<AuthLookupResponse> {
    const phoneVariants = egyptianPhoneLookupVariants(dto.phone);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants }, deletedAt: null },
      select: { id: true, role: true, status: true, name: true, address: true },
    });

    if (!user) {
      return {
        ok: true,
        role: 'new',
        exists: false,
        requiresPassword: false,
        requiresProfile: true,
        hasProfile: false,
        phone: dto.phone,
      };
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.OWNER) {
      return {
        ok: true,
        role: 'admin',
        exists: true,
        requiresPassword: true,
        requiresProfile: false,
        hasProfile: true,
        phone: dto.phone,
      };
    }

    const hasProfile = !!(user.name && user.address);
    return {
      ok: true,
      role: 'customer',
      exists: true,
      requiresPassword: false,
      requiresProfile: !hasProfile,
      hasProfile,
      phone: dto.phone,
    };
  }

  async customerLogin(dto: CustomerLoginDto, request: Request, response: Response): Promise<AuthResponse> {
    const phone = normalizeEgyptianPhone(dto.phone);
    const existingUser = await this.prisma.user.findFirst({ where: { phone, deletedAt: null } });

    if (existingUser && existingUser.role !== UserRole.CUSTOMER) {
      throw new UnauthorizedException('Use admin login for this account');
    }

    const user = existingUser
      ? await this.updateExistingCustomerProfile(existingUser.id, { ...dto, phone })
      : await this.createCustomer({ ...dto, phone });

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is disabled');
    }

    return this.startSession(user.id, Boolean(dto.rememberMe), request, response);
  }

  async adminLogin(dto: AdminLoginDto, request: Request, response: Response): Promise<AuthResponse> {
    const phoneVariants = egyptianPhoneLookupVariants(dto.phone);
    const user = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
        role: { in: [UserRole.ADMIN, UserRole.OWNER] },
        deletedAt: null,
      },
      select: { id: true, passwordHash: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.startSession(user.id, Boolean(dto.rememberMe), request, response);
  }

  async compatibleLogin(dto: CompatibleLoginDto, request: Request, response: Response): Promise<AuthResponse> {
    const phoneVariants = egyptianPhoneLookupVariants(dto.phone);
    const user = await this.prisma.user.findFirst({
      where: { phone: { in: phoneVariants }, deletedAt: null },
      select: { role: true },
    });

    if (user?.role === UserRole.ADMIN || user?.role === UserRole.OWNER) {
      if (!dto.password) {
        throw new UnauthorizedException('Admin password is required');
      }

      return this.adminLogin({ phone: dto.phone, password: dto.password, rememberMe: dto.rememberMe }, request, response);
    }

    return this.customerLogin(dto, request, response);
  }

  async me(request: Request): Promise<AuthMeResponse> {
    const session = await this.authSessionService.findSessionFromRequest(request);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return {
      ok: true,
      csrfToken: this.authSessionService.csrfTokenFromRequest(request),
      user: this.toAuthUser(session.user),
    };
  }

  async logout(session: AuthSessionRecord, dto: LogoutDto, response: Response): Promise<{ ok: true }> {
    if (dto.allDevices) {
      await this.authSessionService.revokeUserSessions(session.user.id);
    } else {
      await this.authSessionService.revokeSession(session.id);
    }

    this.authSessionService.clearAuthCookies(response);
    return { ok: true };
  }

  async updateProfile(session: AuthSessionRecord, dto: UpdateProfileDto): Promise<{ ok: true; user: AuthUserResponse }> {
    this.validateLanguage(dto.language);

    if (dto.newPassword) {
      await this.changePassword(session.user.id, session.id, dto.currentPassword, dto.newPassword);
    }

    if (dto.phone) {
      await this.ensurePhoneAvailable(dto.phone, session.user.id);
    }

    const user = await this.prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: dto.name,
        phone: dto.phone,
        address: dto.address,
        language: dto.language,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        language: true,
        role: true,
      },
    });

    return { ok: true, user };
  }

  async listSessions(currentSession: AuthSessionRecord): Promise<{ ok: true; sessions: SessionListItem[] }> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId: currentSession.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rememberMe: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return {
      ok: true,
      sessions: sessions.map((session) => ({
        ...session,
        expiresAt: session.expiresAt.toISOString(),
        lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
        createdAt: session.createdAt.toISOString(),
        isCurrent: session.id === currentSession.id,
      })),
    };
  }

  async revokeSession(currentSession: AuthSessionRecord, sessionId: string): Promise<{ ok: true }> {
    if (sessionId === currentSession.id) {
      throw new BadRequestException('Use logout to revoke the current session');
    }

    await this.prisma.session.updateMany({
      where: { id: sessionId, userId: currentSession.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  private async startSession(userId: string, rememberMe: boolean, request: Request, response: Response): Promise<AuthResponse> {
    const session = await this.authSessionService.createSession({ userId, rememberMe, request, response });
    return {
      ok: true,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt.toISOString(),
      user: this.toAuthUser(session.user),
    };
  }

  private async createCustomer(dto: CustomerLoginDto): Promise<AuthSessionUser> {
    if (!dto.name || !dto.address) {
      throw new BadRequestException('Name and delivery address are required for a new account');
    }

    this.validateLanguage(dto.language);

    return this.prisma.user.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        address: dto.address,
        language: dto.language ?? 'ar',
        role: UserRole.CUSTOMER,
      },
      select: this.sessionUserSelect(),
    });
  }

  private async updateExistingCustomerProfile(userId: string, dto: CustomerLoginDto): Promise<AuthSessionUser> {
    this.validateLanguage(dto.language);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        address: dto.address,
        language: dto.language,
        lastLoginAt: new Date(),
      },
      select: this.sessionUserSelect(),
    });
  }

  private async changePassword(userId: string, currentSessionId: string, currentPassword: string | undefined, newPassword: string): Promise<void> {
    if (!isStrongPassword(newPassword)) {
      throw new BadRequestException('Use a strong new password of at least 12 characters');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user?.passwordHash || !currentPassword) {
      throw new UnauthorizedException('Current password is required');
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
    await this.authSessionService.revokeUserSessions(userId, currentSessionId);
  }

  private async ensurePhoneAvailable(phone: string, userId: string): Promise<void> {
    const phoneVariants = egyptianPhoneLookupVariants(phone);
    const duplicate = await this.prisma.user.findFirst({ where: { phone: { in: phoneVariants }, id: { not: userId }, deletedAt: null } });
    if (duplicate) {
      throw new ConflictException('This phone number is already used by another account');
    }
  }

  private validateLanguage(language: string | undefined): void {
    if (language && !['ar', 'en'].includes(language)) {
      throw new BadRequestException('Language must be ar or en');
    }
  }

  private toAuthUser(user: AuthSessionUser): AuthUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      language: user.language,
      role: user.role,
    };
  }
  private sessionUserSelect() {
    return {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      language: true,
      role: true,
      status: true,
    } as const;
  }
}
