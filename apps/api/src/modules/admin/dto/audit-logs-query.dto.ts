import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
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
