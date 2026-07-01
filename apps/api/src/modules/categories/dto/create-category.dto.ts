import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @MaxLength(160)
  nameAr!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
