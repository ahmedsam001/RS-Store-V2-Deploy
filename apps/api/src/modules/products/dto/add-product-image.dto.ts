import { ImageSource } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AddProductImageDto {
  @IsString()
  cloudinaryPublicId!: string;

  @IsString()
  secureUrl!: string;

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
  @IsString()
  @MaxLength(220)
  altTextAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  altTextEn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsEnum(ImageSource)
  source?: ImageSource;
}
