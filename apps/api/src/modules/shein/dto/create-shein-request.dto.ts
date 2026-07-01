import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateSheinRequestDto {
  @IsUrl({ require_tld: true, require_protocol: true })
  sourceUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
