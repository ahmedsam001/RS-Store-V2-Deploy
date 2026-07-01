import { ProductVariantStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsString()
  @MaxLength(160)
  nameAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsString()
  priceAmount?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(ProductVariantStatus)
  status?: ProductVariantStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}

export class UpdateProductVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsString()
  priceAmount?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  stockQuantity?: number;

  @IsOptional()
  @IsEnum(ProductVariantStatus)
  status?: ProductVariantStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;
}
