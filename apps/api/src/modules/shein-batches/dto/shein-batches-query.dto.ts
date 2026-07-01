import { SheinBatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const SHEIN_BATCH_STATUS_GROUPS = [
  'COLLECTING',
  'ORDERED',
  'IN_SHIPPING',
  'ARRIVED_SHOP',
  'COMPLETED',
  'CANCELLED',
] as const;

export type SheinBatchStatusGroup = (typeof SHEIN_BATCH_STATUS_GROUPS)[number];

export class SheinBatchesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SheinBatchStatus)
  status?: SheinBatchStatus;

  @IsOptional()
  @IsIn(SHEIN_BATCH_STATUS_GROUPS)
  statusGroup?: SheinBatchStatusGroup;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdTo?: Date;
}
