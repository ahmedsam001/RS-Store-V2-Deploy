import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSheinImportDto {
  @IsString()
  @MaxLength(2000)
  sourceUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  normalizedUrlKey?: string;

  @IsOptional()
  rawPayload?: unknown;
}
