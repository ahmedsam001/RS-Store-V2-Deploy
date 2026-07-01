import { CustomOrderStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewCustomOrderDto {
  @IsEnum(CustomOrderStatus)
  status!: 'ACCEPTED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(220)
  adminTitle?: string;

  @IsOptional()
  @IsString()
  adminPriceAmount?: string;

  @IsOptional()
  @IsString()
  adminShippingAmount?: string;

  @IsOptional()
  @IsString()
  adminTotalAmount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
