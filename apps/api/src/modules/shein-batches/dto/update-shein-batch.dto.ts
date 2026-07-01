import { IsDecimal, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSheinBatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sheinOrderReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  trackingCarrier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrl?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,4' })
  exchangeRateSarToEgp?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
