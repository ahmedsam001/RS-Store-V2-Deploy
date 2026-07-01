import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { SheinReviewedPayloadDto } from './review-shein-import.dto';

export class ApproveSheinImportDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SheinReviewedPayloadDto)
  editedPayload?: SheinReviewedPayloadDto;

  @IsOptional()
  @IsEnum(ProductStatus)
  publishStatus?: ProductStatus;
}
