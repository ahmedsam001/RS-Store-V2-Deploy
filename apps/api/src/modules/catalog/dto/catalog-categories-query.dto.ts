import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CatalogCategoriesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
