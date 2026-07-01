import { Module } from '@nestjs/common';
import { RedisModule } from '../../infrastructure/cache/redis.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SheinController } from './shein.controller';
import { SheinCustomerController } from './shein-customer.controller';
import { SheinAssistJobStore } from './shein-assist-job-store.service';
import { SheinAssistedBrowserService } from './shein-assisted-browser.service';
import { SheinExtractorService } from './shein-extractor.service';
import { SheinFetchService } from './shein-fetch.service';
import { SheinPreviewNormalizer } from './shein-preview.normalizer';
import { SheinProductPublisherService } from './shein-product-publisher.service';
import { SheinService } from './shein.service';
import { SheinUrlService } from './shein-url.service';
import { SheinWorkflowService } from './shein-workflow.service';
import { SheinMarketplaceSettingsService } from './shein-marketplace-settings.service';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UploadsModule, NotificationsModule, AuditModule],
  controllers: [SheinController, SheinCustomerController],
  providers: [
    SheinService,
    SheinAssistJobStore,
    SheinAssistedBrowserService,
    SheinFetchService,
    SheinExtractorService,
    SheinPreviewNormalizer,
    SheinProductPublisherService,
    SheinUrlService,
    SheinWorkflowService,
    SheinMarketplaceSettingsService,
  ],
  exports: [SheinService],
})
export class SheinModule {}
