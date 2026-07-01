import { SheinBatchStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSheinBatchStatusDto {
  @IsEnum(SheinBatchStatus)
  status!: SheinBatchStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
