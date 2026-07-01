import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AuditModule } from '../audit/audit.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule, AuthModule, UploadsModule, AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
