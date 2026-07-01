import { FlashSaleStatus } from '@prisma/client';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FlashSalesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FlashSaleStatus)
  status?: FlashSaleStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsTo?: Date;
}
