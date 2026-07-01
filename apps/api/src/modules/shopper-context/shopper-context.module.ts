import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GuestSessionService } from './guest-session.service';
import { ShopperContextService } from './shopper-context.service';

@Module({
  imports: [AuthModule],
  providers: [GuestSessionService, ShopperContextService],
  exports: [ShopperContextService],
})
export class ShopperContextModule {}
