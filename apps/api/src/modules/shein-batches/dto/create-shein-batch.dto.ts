import { SheinBatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AddSheinBatchItemDto } from './add-shein-batch-item.dto';

export class CreateSheinBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sheinOrderReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingCarrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,4' })
  exchangeRateSarToEgp?: string;

  @IsOptional()
  @IsEnum(SheinBatchStatus)
  status?: SheinBatchStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  orderedAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AddSheinBatchItemDto)
  items?: AddSheinBatchItemDto[];
}
