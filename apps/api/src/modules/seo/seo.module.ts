import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
