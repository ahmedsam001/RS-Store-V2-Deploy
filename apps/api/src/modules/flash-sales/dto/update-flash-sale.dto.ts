import { FlashSaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsDecimal, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFlashSaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  titleAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  titleEn?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  discountPercent?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsEnum(FlashSaleStatus)
  status?: FlashSaleStatus;
}
