import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminBootstrapModule } from './modules/admin-bootstrap/admin-bootstrap.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CustomOrdersModule } from './modules/custom-orders/custom-orders.module';
import { FlashSalesModule } from './modules/flash-sales/flash-sales.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SeoModule } from './modules/seo/seo.module';
import { SheinModule } from './modules/shein/shein.module';
import { SheinBatchesModule } from './modules/shein-batches/shein-batches.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { validateEnvironment } from './config/env.validation';
import { RedisModule } from './infrastructure/cache/redis.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { CloudinaryModule } from './infrastructure/storage/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    RedisModule,
    AuditModule,
    NotificationsModule,
    CloudinaryModule,
    AdminBootstrapModule,
    AuthModule,
    UsersModule,
    CatalogModule,
    CartModule,
    WishlistModule,
    CategoriesModule,
    CustomOrdersModule,
    ProductsModule,
    OrdersModule,
    FlashSalesModule,
    SettingsModule,
    UploadsModule,
    SheinModule,
    SheinBatchesModule,
    AdminModule,
    HealthModule,
    SeoModule,
  ],
})
export class AppModule {}
