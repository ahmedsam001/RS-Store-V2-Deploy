import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { moneyStringToMinorUnits } from '../../../common/money/money';
import { IsGreaterThanOrEqualTo } from '../../../common/validators/is-greater-than-or-equal-to.validator';

export const catalogProductSortOptions = ['newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'] as const;
export type CatalogProductSort = (typeof catalogProductSortOptions)[number];

export class CatalogProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  categorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  subCategorySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subCategory?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => moneyStringToMinorUnits(String(value), 'minPrice'))
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => moneyStringToMinorUnits(String(value), 'maxPrice'))
  @IsNumber()
  @Min(0)
  @IsGreaterThanOrEqualTo('minPrice', { message: 'maxPrice must be greater than or equal to minPrice' })
  maxPrice?: number;

  @IsOptional()
  @IsIn(catalogProductSortOptions)
  sort?: CatalogProductSort;
}
