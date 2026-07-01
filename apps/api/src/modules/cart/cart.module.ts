import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ShopperContextModule } from '../shopper-context/shopper-context.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [PricingModule, ShopperContextModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
