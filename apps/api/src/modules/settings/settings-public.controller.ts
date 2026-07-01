import { Controller, Get } from '@nestjs/common';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsPublicController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('public/storefront')
  @RateLimit({ bucket: 'public_settings_storefront', limit: 120, windowMs: 60 * 1000 })
  findStorefrontSettings() {
    return this.settingsService.findStorefrontSettings();
  }
}
