import { Module } from '@nestjs/common';
import { PricingModule } from '../pricing/pricing.module';
import { ShopperContextModule } from '../shopper-context/shopper-context.module';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

@Module({
  imports: [ShopperContextModule, PricingModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
