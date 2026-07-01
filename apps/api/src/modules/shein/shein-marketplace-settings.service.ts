import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SettingScope } from '@prisma/client';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { UpdateSheinMarketplaceSettingsDto } from './dto/update-shein-marketplace-settings.dto';
import {
  DEFAULT_SHEIN_COUNTRY,
  DEFAULT_SHEIN_LANGUAGE,
  FIXED_SHEIN_CURRENCY,
  SHEIN_COUNTRY_SETTING_KEY,
  SHEIN_CURRENCY_SETTING_KEY,
  SHEIN_LANGUAGE_SETTING_KEY,
  SUPPORTED_SHEIN_COUNTRIES,
  SheinMarketplaceSettings,
  assertSupportedSheinCountry,
  normalizeSheinCountry,
  normalizeSheinLanguage,
} from './shein-marketplace';

@Injectable()
export class SheinMarketplaceSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getSettings(): Promise<SheinMarketplaceSettings> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [SHEIN_COUNTRY_SETTING_KEY, SHEIN_CURRENCY_SETTING_KEY, SHEIN_LANGUAGE_SETTING_KEY] } },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const envCountry = normalizeSheinCountry(this.configService.get<string>('SHEIN_IMPORT_COUNTRY_CODE'), DEFAULT_SHEIN_COUNTRY);
    const countryCode = normalizeSheinCountry(map.get(SHEIN_COUNTRY_SETTING_KEY), envCountry);
    const language = normalizeSheinLanguage(map.get(SHEIN_LANGUAGE_SETTING_KEY) ?? this.configService.get<string>('SHEIN_IMPORT_LANGUAGE') ?? DEFAULT_SHEIN_LANGUAGE);

    return {
      countryCode,
      currencyCode: FIXED_SHEIN_CURRENCY,
      language,
      countries: SUPPORTED_SHEIN_COUNTRIES,
    };
  }

  async updateSettings(dto: UpdateSheinMarketplaceSettingsDto, user: AuthenticatedUser): Promise<SheinMarketplaceSettings> {
    const countryCode = assertSupportedSheinCountry(dto.countryCode);
    const language = normalizeSheinLanguage(dto.language ?? DEFAULT_SHEIN_LANGUAGE);
    const data = [
      { key: SHEIN_COUNTRY_SETTING_KEY, value: countryCode, description: 'SHEIN import target marketplace country' },
      { key: SHEIN_CURRENCY_SETTING_KEY, value: FIXED_SHEIN_CURRENCY, description: 'SHEIN import fixed order currency' },
      { key: SHEIN_LANGUAGE_SETTING_KEY, value: language, description: 'SHEIN import language' },
    ];

    await this.prisma.$transaction(data.map((setting) => this.prisma.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value as Prisma.InputJsonValue,
        scope: SettingScope.ADMIN,
        description: setting.description,
        updatedById: user.id,
      },
      update: {
        value: setting.value as Prisma.InputJsonValue,
        scope: SettingScope.ADMIN,
        description: setting.description,
        updatedById: user.id,
      },
    })));

    return this.getSettings();
  }
}
