import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { FIXED_SHEIN_CURRENCY, SUPPORTED_SHEIN_COUNTRY_CODES } from '../shein-marketplace';

export class UpdateSheinMarketplaceSettingsDto {
  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsString()
  @IsIn(SUPPORTED_SHEIN_COUNTRY_CODES, {
    message: 'Selected country is not supported for SHEIN import',
  })
  countryCode!: string;

  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? FIXED_SHEIN_CURRENCY)
      .trim()
      .toUpperCase(),
  )
  @IsIn([FIXED_SHEIN_CURRENCY], { message: 'SHEIN import currency must be SAR' })
  currencyCode?: typeof FIXED_SHEIN_CURRENCY;

  @IsOptional()
  @Transform(({ value }) =>
    String(value ?? 'ar')
      .trim()
      .toLowerCase(),
  )
  @IsIn(['ar', 'en'], { message: 'SHEIN language must be ar or en' })
  language?: string;
}
