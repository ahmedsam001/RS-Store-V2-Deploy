import { IsDecimal, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddSheinBatchItemDto {
  @IsUUID()
  orderItemId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  unitSarAmount?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  unitEgpAmount?: string;

  @IsOptional()
  @IsString()
  whatsappMessageTemplate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
