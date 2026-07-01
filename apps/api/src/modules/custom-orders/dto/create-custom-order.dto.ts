import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class CreateCustomOrderDto {
  @IsString()
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  productUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  requestedColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  requestedSize?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity = 1;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;
}
