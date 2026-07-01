import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SHEIN_MAX_PRODUCT_IMAGES } from '../shein-image-filter';
import { FIXED_SHEIN_CURRENCY, SUPPORTED_SHEIN_COUNTRY_CODES } from '../shein-marketplace';

function trimStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const normalized = item.replace(/\s+/g, ' ').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export class SheinReviewedImageDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  altTextAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  cloudinaryPublicId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  byteSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  format?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsIn(['SHEIN_IMPORT', 'ADMIN_UPLOAD'])
  source?: 'SHEIN_IMPORT' | 'ADMIN_UPLOAD';
}

export class SheinReviewedVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @IsString()
  @Length(1, 180)
  nameAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : String(value).replace(/,/g, '').trim()))
  @IsNumberString({ no_symbols: false })
  @MaxLength(30)
  priceAmount?: string;

  @Transform(({ value }) => Math.max(0, Math.trunc(Number(value ?? 0) || 0)))
  @IsInt()
  @Min(0)
  stockQuantity!: number;
}

export class SheinReviewedPayloadDto {
  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsString()
  @Length(2, 220)
  nameAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @Transform(({ value }) => String(value ?? '').replace(/,/g, '').trim())
  @IsNumberString({ no_symbols: false })
  @MaxLength(30)
  priceAmount!: string;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn([FIXED_SHEIN_CURRENCY], { message: 'SHEIN import currency must be SAR' })
  currency!: typeof FIXED_SHEIN_CURRENCY;

  @Transform(({ value }) => String(value ?? '').trim().toUpperCase())
  @IsIn(SUPPORTED_SHEIN_COUNTRY_CODES, { message: 'Selected country is not supported for SHEIN import' })
  country!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsString()
  @MaxLength(180)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoryName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subCategory?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : Number(value)))
  @IsNumber()
  @Min(1)
  @Max(1000)
  exchangeRate?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? undefined : String(value).replace(/,/g, '').trim()))
  @IsNumberString({ no_symbols: false })
  @MaxLength(30)
  storePriceAmount?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? 0 : Number(value)))
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null || value === '' ? 0 : Number(value)))
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SHEIN_MAX_PRODUCT_IMAGES, { message: 'Maximum 20 product images allowed' })
  @ValidateNested({ each: true })
  @Type(() => SheinReviewedImageDto)
  images?: SheinReviewedImageDto[];

  @IsOptional()
  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  sizes?: string[];

  @IsOptional()
  @Transform(({ value }) => trimStringArray(value))
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => SheinReviewedVariantDto)
  variants?: SheinReviewedVariantDto[];
}

export class ReviewSheinImportDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => SheinReviewedPayloadDto)
  editedPayload!: SheinReviewedPayloadDto;
}
