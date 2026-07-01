import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SheinBatchesController } from './shein-batches.controller';
import { SheinBatchesService } from './shein-batches.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [SheinBatchesController],
  providers: [SheinBatchesService],
  exports: [SheinBatchesService],
})
export class SheinBatchesModule {}
