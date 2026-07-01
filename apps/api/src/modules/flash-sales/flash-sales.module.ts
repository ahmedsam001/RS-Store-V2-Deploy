import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PricingModule } from '../pricing/pricing.module';
import { AuditModule } from '../audit/audit.module';
import { FlashSalesController } from './flash-sales.controller';
import { FlashSalesService } from './flash-sales.service';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule, PricingModule],
  controllers: [FlashSalesController],
  providers: [FlashSalesService],
  exports: [FlashSalesService],
})
export class FlashSalesModule {}
