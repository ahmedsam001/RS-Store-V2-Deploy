import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomOrderStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CustomOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CustomOrderStatus)
  status?: CustomOrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;
}
