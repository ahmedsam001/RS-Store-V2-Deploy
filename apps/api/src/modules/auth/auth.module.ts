import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionService } from './services/auth-session.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
    CsrfGuard,
    { provide: APP_GUARD, useExisting: RateLimitGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
  exports: [AuthService, AuthSessionService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
