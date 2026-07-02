import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { ProductPricingService } from './product-pricing.service';

@Module({
  imports: [PrismaModule],
  providers: [ProductPricingService],
  exports: [ProductPricingService],
})
export class PricingModule {}
