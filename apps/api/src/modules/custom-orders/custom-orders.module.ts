import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { CustomOrdersController } from './custom-orders.controller';
import { CustomOrdersService } from './custom-orders.service';

@Module({
  imports: [PrismaModule, AuthModule, UploadsModule, AuditModule],
  controllers: [CustomOrdersController],
  providers: [CustomOrdersService],
})
export class CustomOrdersModule {}
