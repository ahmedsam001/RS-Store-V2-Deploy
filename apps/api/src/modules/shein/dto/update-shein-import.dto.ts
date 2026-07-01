import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class UpdateSheinImportDto {
  @IsOptional()
  @IsUUID()
  createdProductId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  importedImagesCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  errorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string;
}
