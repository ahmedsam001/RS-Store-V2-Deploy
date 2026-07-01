import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsController } from './settings.controller';
import { SettingsPublicController } from './settings-public.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [SettingsController, SettingsPublicController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
