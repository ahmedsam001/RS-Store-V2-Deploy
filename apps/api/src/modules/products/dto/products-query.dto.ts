import { ProductStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export type SortBy = 'createdAt' | 'priceAmount' | 'name' | 'status';
export type SortOrder = 'asc' | 'desc';
export type StockStatus = 'all' | 'inStock' | 'outOfStock';

export class ProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(220)
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(['all', 'inStock', 'outOfStock'] as const)
  stockStatus?: StockStatus;

  @IsOptional()
  @IsEnum(['createdAt', 'priceAmount', 'name', 'stock', 'status'] as const)
  sortBy?: SortBy;

  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  sortOrder?: SortOrder;
}
