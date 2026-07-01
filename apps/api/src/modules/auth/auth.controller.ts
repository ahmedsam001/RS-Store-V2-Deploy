import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentSession } from '../../common/decorators/current-session.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { SkipCsrf } from '../../common/decorators/skip-csrf.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CompatibleLoginDto } from './dto/compatible-login.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { LookupDto } from './dto/lookup.dto';
import { LogoutDto } from './dto/logout.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthSessionRecord } from './services/auth-session.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.setNoStoreHeaders(response);
    return this.authService.me(request);
  }

  @Post('lookup')
  @SkipCsrf()
  @RateLimit({ bucket: 'auth_lookup', limit: 10, windowMs: 15 * 60 * 1000 })
  lookup(@Body() dto: LookupDto) {
    return this.authService.lookup(dto);
  }

  @Post('customer/login')
  @SkipCsrf()
  @RateLimit({ bucket: 'customer_login', limit: 10, windowMs: 15 * 60 * 1000 })
  customerLogin(@Body() dto: CustomerLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.setNoStoreHeaders(response);
    return this.authService.customerLogin(dto, request, response);
  }

  @Post('admin/login')
  @SkipCsrf()
  @RateLimit({ bucket: 'admin_login', limit: 10, windowMs: 15 * 60 * 1000 })
  adminLogin(@Body() dto: AdminLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.setNoStoreHeaders(response);
    return this.authService.adminLogin(dto, request, response);
  }

  @Post('login')
  @SkipCsrf()
  @RateLimit({ bucket: 'compatible_login', limit: 10, windowMs: 15 * 60 * 1000 })
  compatibleLogin(
    @Body() dto: CompatibleLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.compatibleLogin(dto, request, response);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentSession() session: AuthSessionRecord,
    @Body() dto: LogoutDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.setNoStoreHeaders(response);
    return this.authService.logout(session, dto, response);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  profile(
    @CurrentSession() session: AuthSessionRecord,
    @Body() dto: UpdateProfileDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.setNoStoreHeaders(response);
    return this.authService.updateProfile(session, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  sessions(@CurrentSession() session: AuthSessionRecord) {
    return this.authService.listSessions(session);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  revokeSession(@CurrentSession() session: AuthSessionRecord, @Param('id') sessionId: string) {
    return this.authService.revokeSession(session, sessionId);
  }

  private setNoStoreHeaders(response: Response): void {
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    response.setHeader('Surrogate-Control', 'no-store');
  }
}
