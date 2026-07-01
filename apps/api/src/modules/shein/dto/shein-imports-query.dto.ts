import { SheinImportStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SheinImportsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SheinImportStatus)
  status?: SheinImportStatus;

  @IsOptional()
  @IsUUID()
  requestedById?: string;
}
