import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../infrastructure/cache/redis.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { CloudinaryModule } from '../../infrastructure/storage/cloudinary/cloudinary.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, CloudinaryModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
