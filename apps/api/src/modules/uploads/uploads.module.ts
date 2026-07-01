import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { CloudinaryModule } from '../../infrastructure/storage/cloudinary/cloudinary.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [CloudinaryModule, PrismaModule, AuthModule, AuditModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
